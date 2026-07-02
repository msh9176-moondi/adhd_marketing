// =====================================================
// FLOCA 코칭 플랫폼 - Google Apps Script 백엔드
// 배포 설정: 실행 계정 = 나 / 액세스 = 모든 사용자(익명 포함)
// =====================================================

const CONFIGS = {
  coachees:       { name:'피코치',     keys:['id','name','phone','email','adhdStatus','difficulties','topics','availableTimes','riskFlag','status','createdAt'],                                                                                                          json:['difficulties','topics','availableTimes'] },
  surveys:        { name:'설문',       keys:['id','coacheeId','type','answers','categoryScores','extraAnswers','bestPart','regret','createdAt'],                                                                                                                          json:['answers','categoryScores','extraAnswers'] },
  matchings:      { name:'매칭',       keys:['id','coacheeId','coachId','status','firstContactDone','matchedAt'],                                                                                                                                                        json:[] },
  goalAgreements: { name:'목표합의서', keys:['id','coacheeId','coachId','coacheeName','coachName','topic','desiredOutcome','actionPlan','evaluationMethod','currentScore','targetScore','coacheeConsent','coacheeSigAt','coachConsent','coachSigAt','status','revisionNote','revisionRequestedAt','agreedAt'], json:[] },
  sessions:       { name:'세션일지',   keys:['id','coacheeId','coachId','sessionNumber','sessionDate','nextSessionDate','sessionGoal','coachingGoal','assignmentReview','share','develop','learning','wrapUp','outcome','nextAction','notes','completed','createdAt'], json:[] },
  reflections:    { name:'성찰일지',   keys:['id','sessionId','coacheeId','topic','previousActionDone','targetScore','previousScore','currentScore','learned','felt','actionPlan','nextSessionExpectation','createdAt'],                                                json:[] },
  onboardings:    { name:'온보딩',     keys:['id','coacheeId','selfIntro','expectations','concerns','preferredCommunication','preferredMeetingTime','createdAt'],                                                                                                        json:['preferredCommunication','preferredMeetingTime'] },
  pledges:        { name:'서약',       keys:['id','coacheeId','coacheeName','signedAt','agreed'],                                                                                                                                                                        json:[] },
  followups:      { name:'사후관리',   keys:['id','coacheeId','shortScores','continuingBehaviors','challenges','biggestChange','needsSupport','nextProgram','createdAt'],                                                                                                json:['shortScores','nextProgram'] }
};

// ===== POST: URLSearchParams 방식으로 수신 =====
function doPost(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  try {
    const type    = e.parameter.type;
    const payload = JSON.parse(e.parameter.payload || '{}');
    const config  = CONFIGS[type];
    if (!config) throw new Error('Unknown type: ' + type);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, config);
    upsertRow(sheet, config, payload);

    out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    out.setContent(JSON.stringify({ ok: false, error: err.message }));
  }
  return out;
}

// ===== GET: 저장 + 조회 + 핑 =====
function doGet(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);
  try {
    // 연결 테스트
    if (e.parameter.action === 'ping') {
      out.setContent(JSON.stringify({ ok: true, message: 'FLOCA Sheets 연결 정상' }));
      return out;
    }

    // GET 방식 저장 (POST redirect 문제 우회)
    if (e.parameter.action === 'save') {
      const type    = e.parameter.type;
      const payload = JSON.parse(e.parameter.payload || '{}');
      const config  = CONFIGS[type];
      if (!config) throw new Error('Unknown type: ' + type);
      const ss    = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = getOrCreateSheet(ss, config);
      upsertRow(sheet, config, payload);
      out.setContent(JSON.stringify({ ok: true }));
      return out;
    }

    const type   = e.parameter.type;
    const config = CONFIGS[type];
    if (!config) throw new Error('Unknown type: ' + type);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(config.name);
    if (!sheet || sheet.getLastRow() <= 1) {
      out.setContent(JSON.stringify({ ok: true, data: [] }));
      return out;
    }

    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0];
    let data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const raw = row[i];
        if (config.json.includes(h)) {
          try { obj[h] = JSON.parse(raw || 'null'); } catch { obj[h] = null; }
        } else {
          obj[h] = (raw === '' || raw === undefined) ? null : raw;
        }
      });
      return obj;
    });

    // 필터
    if (e.parameter.coacheeId) data = data.filter(d => d.coacheeId == e.parameter.coacheeId);
    if (e.parameter.coachId)   data = data.filter(d => d.coachId   == e.parameter.coachId);
    if (e.parameter.id)        data = data.filter(d => d.id        == e.parameter.id);
    if (e.parameter.surveyType) data = data.filter(d => d.type     == e.parameter.surveyType);

    out.setContent(JSON.stringify({ ok: true, data }));
  } catch (err) {
    out.setContent(JSON.stringify({ ok: false, error: err.message }));
  }
  return out;
}

// ===== 시트 생성 또는 가져오기 =====
function getOrCreateSheet(ss, config) {
  let sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    sheet = ss.insertSheet(config.name);
    sheet.appendRow(config.keys);
    const headerRange = sheet.getRange(1, 1, 1, config.keys.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#E8F0FE');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ===== Upsert: id 기준으로 있으면 수정, 없으면 추가 =====
function upsertRow(sheet, config, payload) {
  const rows   = sheet.getDataRange().getValues();
  const idCol  = rows[0].indexOf('id');
  const newRow = config.keys.map(k => {
    const v = payload[k];
    if (v === undefined || v === null) return '';
    return config.json.includes(k) ? JSON.stringify(v) : v;
  });

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(payload.id)) {
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return;
    }
  }
  sheet.appendRow(newRow);
}

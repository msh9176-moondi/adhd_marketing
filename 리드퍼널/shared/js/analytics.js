/* ===== FLOCA Analytics ===== */
/* Google Analytics 초기화 및 이벤트 트래킹 */

// GA 초기화
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-HSNDRX38MB');

/**
 * 이벤트 트래킹 함수
 * @param {string} category - 이벤트 카테고리 (예: 'conversion', 'engagement')
 * @param {string} action - 이벤트 액션 (예: 'kakao_click', 'download')
 * @param {string} label - 이벤트 라벨 (예: 'coaching_page', 'survey_page')
 */
function trackEvent(category, action, label) {
  gtag('event', action, {
    'event_category': category,
    'event_label': label
  });
}

/**
 * 페이지뷰 트래킹 함수
 * @param {string} pagePath - 페이지 경로
 * @param {string} pageTitle - 페이지 제목
 */
function trackPageView(pagePath, pageTitle) {
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle
  });
}

// 카카오톡 링크 클릭 자동 트래킹
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('a[href*="open.kakao.com"]').forEach(function(link) {
    link.addEventListener('click', function() {
      trackEvent('conversion', 'kakao_click', currentPage);
    });
  });
});

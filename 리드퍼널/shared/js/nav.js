/* ===== FLOCA Navigation ===== */
/* 네비게이션 active 상태 및 동작 관리 */

document.addEventListener('DOMContentLoaded', function() {
  // 현재 페이지 경로 추출
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');

  // 현재 페이지에 active 클래스 추가
  navLinks.forEach(function(link) {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});

/**
 * 플로팅 CTA 스크롤 이벤트
 * 히어로 섹션 이후에 표시
 */
function initFloatingCTA() {
  const floatingCta = document.getElementById('floatingCta');
  if (!floatingCta) return;

  const hero = document.querySelector('.hero');
  if (!hero) return;

  window.addEventListener('scroll', function() {
    const scrollY = window.scrollY;
    const heroHeight = hero.offsetHeight;

    if (scrollY > heroHeight * 0.5) {
      floatingCta.classList.add('visible');
    } else {
      floatingCta.classList.remove('visible');
    }
  });
}

// 페이지 로드 시 플로팅 CTA 초기화
document.addEventListener('DOMContentLoaded', initFloatingCTA);

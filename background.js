// 확장 프로그램이 설치되거나 업데이트될 때 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log('Jumplix 확장 프로그램이 설치되었습니다.');
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "execute") {
    console.log('백그라운드에서 작업이 실행되었습니다.');
  }
}); 
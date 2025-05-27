document.addEventListener('DOMContentLoaded', function () {
  const actionButton = document.getElementById('actionButton');
  let isEnabled = false;

  // 저장된 상태 불러오기
  chrome.storage.local.get(['autoSkipEnabled'], function (result) {
    isEnabled = result.autoSkipEnabled || false;
    updateButtonState();
  });

  function updateButtonState() {
    if (isEnabled) {
      actionButton.classList.remove('off');
      actionButton.textContent = 'Auto Skip: ON';
    } else {
      actionButton.classList.add('off');
      actionButton.textContent = 'Auto Skip: OFF';
    }
  }

  actionButton.addEventListener('click', async () => {
    isEnabled = !isEnabled;
    updateButtonState();

    // 상태 저장
    chrome.storage.local.set({ autoSkipEnabled: isEnabled });

    // 현재 활성화된 탭 가져오기
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // content script에 메시지 전송
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleAutoSkip",
      enabled: isEnabled
    });
  });
}); 
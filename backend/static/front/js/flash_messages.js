// 处理 flash 消息显示
var flashMessagesShown = false; // 标记变量，确保只执行一次

function showFlashMessages() {
  // 如果已经执行过，直接返回
  if (flashMessagesShown) {
    console.log('Flash messages already shown, skipping...');
    return;
  }
  
  // 标记为已执行
  flashMessagesShown = true;
  
  var flashContainer = document.getElementById('flash-messages');
  if (!flashContainer) return;
  
  var flashData = flashContainer.getAttribute('data-messages');
  
  // 调试信息
  console.log('flashData:', flashData, 'type:', typeof flashData);
  
  // 检查是否为有效的JSON字符串
  if (!flashData || flashData === '' || flashData.trim() === '') return;
  
  // 额外检查，确保数据看起来像有效的JSON数组
  if (flashData.length < 2 || flashData.charAt(0) !== '[' || flashData.charAt(flashData.length - 1) !== ']') {
    console.error('Invalid JSON format:', flashData);
    return;
  }
  
  // 检查是否有不完整的JSON数组（如"[["）
  if (flashData === '[[]' || flashData === '[[]]' || flashData === '[[') {
    console.error('Incomplete JSON array:', flashData);
    return;
  }
  
  try {
    var messages = JSON.parse(flashData);
    
    for (var i = 0; i < messages.length; i++) {
      var category = messages[i][0];
      var message = messages[i][1];
      
      if (category === 'error' || category === 'danger') {
        toastr.error(message);
      } else if (category === 'warning') {
        toastr.warning(message);
      } else if (category === 'info') {
        toastr.info(message);
      } else {
        toastr.success(message);
      }
    }
  } catch (e) {
    console.error('解析 flash 消息失败:', e, 'flashData was:', flashData);
  }
}

// 页面加载完成后显示消息
if (document.readyState === 'loading') {
  // DOM还在加载，添加事件监听器
  document.addEventListener('DOMContentLoaded', showFlashMessages);
} else {
  // DOM已经加载完成，直接执行
  showFlashMessages();
}

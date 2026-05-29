$(function () {
    // 获取搜索框元素
    var searchInput = $('#search-posts');
    
    // 搜索功能实现
    function performSearch() {
        // 获取搜索关键词并去除前后空格
        var keyword = searchInput.val().trim();
        
        // 如果关键词不为空，则进行搜索
        if (keyword) {
            // 构建搜索URL，保留现有参数并添加搜索参数
            var url = new URL(window.location.href);
            
            // 移除可能存在的搜索参数，避免重复添加
            url.searchParams.delete('search');
            
            // 添加新的搜索参数
            url.searchParams.append('search', keyword);
            
            // 跳转到搜索结果页面
            window.location.href = url.toString();
        }
    }
    
    // 为搜索框添加点击事件触发搜索
    searchInput.on('click', function () {
        performSearch();
    });
    
    // 为搜索框添加回车键触发搜索
    searchInput.on('keypress', function (e) {
        if (e.which === 13) { // 回车键的ASCII码是13
            performSearch();
        }
    });
});
// CMS Bundle - 合并了所有CMS页面的JavaScript功能
// 包含posts.js, comments.js, boards.js, reports.js, users.js的功能

$(function(){
    // 帖子管理功能
    $(".active-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var is_active = parseInt($this.attr("data-active"));
        var post_id = $this.attr('data-post-id');
        var comment_id = $this.attr("data-comment-id");
        var board_id = $this.attr("data-board-id");
        
        // 根据不同的操作对象显示不同的确认消息
        var message = "";
        if (post_id) {
            message = is_active?"您确定要隐藏此帖子吗？":"您确定要显示此帖子吗？";
        } else if (comment_id) {
            message = is_active?"您确定要隐藏此评论吗？":"您确定要显示此评论吗？";
        } else if (board_id) {
            message = is_active?"您确定要隐藏此板块吗？":"您确定要显示此板块吗？";
        }
        
        var result = confirm(message);
        if (!result){
            return;
        }
        
        var data = {
            is_active: is_active?0:1
        };
        
        var url = "";
        if (post_id) {
            url = "/cms/posts/active/" + post_id;
        } else if (comment_id) {
            url = "/cms/comments/active/" + comment_id;
        } else if (board_id) {
            url = "/cms/boards/active/" + board_id;
        }
        
        dtajax.post({
            url: url,
            data: data
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });

    // 删除功能（帖子、评论、举报）
    $(".delete-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var post_id = $this.attr('data-post-id');
        var comment_id = $this.attr('data-comment-id');
        var report_id = $this.attr('data-report-id');
        
        var message = "您确定要删除此项吗？此操作不可恢复！";
        if (post_id) {
            message = "您确定要删除此帖子吗？此操作不可恢复！";
        } else if (comment_id) {
            message = "您确定要删除此评论吗？此操作不可恢复！";
        }
        
        var result = confirm(message);
        if (!result){
            return;
        }
        
        var url = "";
        if (post_id) {
            url = "/cms/posts/delete/" + post_id;
        } else if (comment_id) {
            url = "/cms/comments/delete/" + comment_id;
        } else if (report_id) {
            url = "/cms/reports/delete/" + report_id;
        }
        
        dtajax.post({
            url: url
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "删除失败！";
            toastr.error(errorMsg);
        });
    });
    
    // 举报处理功能
    $(".handle-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var report_id = $this.attr('data-report-id');
        var result = confirm("您确定要处理此举报吗？");
        if (!result){
            return;
        }
        dtajax.post({
            url: "/cms/reports/handle/" + report_id
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
    
    // 隐藏帖子功能（举报页面）
    $(".hide-post-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var post_id = $this.attr('data-post-id');
        var report_id = $this.attr('data-report-id');
        var result = confirm("您确定要隐藏此帖子吗？");
        if (!result){
            return;
        }
        dtajax.post({
            url: "/cms/reports/hide-post/" + post_id,
            data: {
                report_id: report_id
            }
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
    
    // 用户激活/禁用功能
    $(".active-user-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var user_id = $this.attr('data-user-id');
        var is_active = parseInt($this.attr("data-active"));
        var message = is_active?"您确定要禁用此用户吗？":"您确定要启用此用户吗？";
        var result = confirm(message);
        if (!result){
            return;
        }
        var data = {
            is_active: is_active?0:1
        };
        dtajax.post({
            url: "/cms/users/active/" + user_id,
            data: data
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
});
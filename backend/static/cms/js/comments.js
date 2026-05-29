$(function(){
    $(".active-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var is_active = parseInt($this.attr('data-active'));
        var comment_id = $this.attr("data-comment-id");
        var message = is_active?"您确定要隐藏此评论吗？":"您确定要显示此评论吗？";
        var result = confirm(message);
        if (!result){
            return;
        }
        var data = {
            is_active: is_active?0:1
        }
        dtajax.post({
            url: "/cms/comments/active/" + comment_id,
            data: data
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            // 从responseJSON中获取错误消息
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        })

    });

    // 删除评论功能
    $(".delete-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var comment_id = $this.attr('data-comment-id');
        var result = confirm("您确定要删除此评论吗？此操作不可恢复！");
        if (!result){
            return;
        }
        dtajax.post({
            url: "/cms/comments/delete/" + comment_id
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            // 从responseJSON中获取错误消息
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "删除失败！";
            toastr.error(errorMsg);
        })
    });
});
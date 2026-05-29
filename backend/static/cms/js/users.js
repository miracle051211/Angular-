$(function(){
    $(".active-btn").click(function(event){
        event.preventDefault();
        var $this = $(this);
        var is_active = parseInt($this.attr("data-active"));
        var message = is_active?"您确定要禁用此用户吗?":"您确定要取消禁用此用户吗？";
        var user_id = $this.attr("data-user-id");
        var result = confirm(message);
        if (!result){
            return;
        }
        var data = {
            is_active: is_active?0:1
        };
        $.ajax({
            url: "/cms/users/active/" + user_id,
            type: 'POST',
            contentType: 'application/json',
            headers: {
                'X-CSRFToken': $('meta[name=csrf-token]').attr('content')
            },
            data: JSON.stringify(data),
            success: function(response) {
                window.location.reload();
            },
            error: function(xhr, status, error) {
                // 从responseJSON中获取错误消息
                var errorMsg = xhr.responseJSON ? xhr.responseJSON.message : xhr.responseText || "操作失败！";
                toastr.error(errorMsg);
            }
        });
    });
});
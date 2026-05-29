$(function(){
    $("#captcha-btn").on("click", function(event){
        // 阻止按钮的默认行为
        event.preventDefault();
        
        var btn = $(this);
        // 如果按钮已经在倒计时状态，直接返回
        if (btn.attr("disabled")) {
            return;
        }

        // 获取邮箱
        var email = $("input[name = 'email']").val();

        dtajax.get({
            url:"/user/mail/captcha0?mail=" + email
        }).done(function(result){
            toastr.success("验证码发送成功!");
            // 开始倒计时
            startCountdown(btn);
        }).fail(function(error){
            // 从responseJSON中获取错误消息
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "验证码发送失败！";
            toastr.error(errorMsg);
        })

    });
    
    // 验证码倒计时函数
    function startCountdown(btn) {
        var countdown = 60; // 倒计时时间（秒）
        btn.attr("disabled", true);
        btn.html('<span>重新发送(' + countdown + ')</span><span></span>');
        
        var timer = setInterval(function() {
            countdown--;
            btn.html('<span>重新发送(' + countdown + ')</span><span></span>');
            
            if (countdown <= 0) {
                clearInterval(timer);
                btn.attr("disabled", false);
                btn.html('<span>Send captcha</span><span></span>');
            }
        }, 1000);
    }
});
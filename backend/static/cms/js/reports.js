$(function(){
    // 切换处理状态
    $(document).on('click', '.handle-btn', function(event){
        event.preventDefault();
        var $this = $(this);
        var report_id = $this.attr('data-report-id');
        var action = $this.text().trim();
        var result = confirm('您确定要' + action + '吗？');
        if (!result){
            return;
        }
        
        dtajax.post({
            url: "/cms/reports/handle/" + report_id,
            data: {}
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
    
    // 删除举报
    $(document).on('click', '.delete-btn', function(event){
        event.preventDefault();
        var $this = $(this);
        var report_id = $this.attr('data-report-id');
        var result = confirm('您确定要删除此举报吗？');
        if (!result){
            return;
        }
        
        dtajax.post({
            url: "/cms/reports/delete/" + report_id,
            data: {}
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
    
    // 隐藏/显示帖子
    $(document).on('click', '.hide-post-btn', function(event){
        event.preventDefault();
        var $this = $(this);
        var post_id = $this.attr('data-post-id');
        var report_id = $this.attr('data-report-id');
        var action = $this.text().trim();
        var result = confirm('您确定要' + action + '吗？');
        if (!result){
            return;
        }
        
        dtajax.post({
            url: "/cms/reports/hide-post/" + post_id,
            data: { report_id: report_id }
        }).done(function(){
            window.location.reload();
        }).fail(function(error){
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "操作失败！";
            toastr.error(errorMsg);
        });
    });
});
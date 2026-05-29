$(function() {
    console.log('public_post.js loaded successfully');
    
    // 检查DOM元素是否存在
    console.log('AI inspiration button exists:', $('#ai-inspiration').length > 0);
    console.log('AI continue button exists:', $('#ai-continue').length > 0);
    console.log('AI structure button exists:', $('#ai-structure').length > 0);
    console.log('AI polish button exists:', $('#ai-polish').length > 0);
    console.log('AI reply button exists:', $('#ai-reply').length > 0);
    
    var editor = new window.wangEditor("#editor");
    editor.config.uploadImgServer = "/upload/image";
    editor.config.uploadFileName = "image";
    
    // 移除自定义 MENU_CONF 配置，使用编辑器默认弹窗设置以确保功能正常
    
    editor.create();
    console.log('Editor created successfully');

    // 显示AI结果
    function showAIResult(result) {
        $('#ai-result-content').html(result);
        $('#ai-result').show();
    }
    
    // 隐藏AI结果
    function hideAIResult() {
        $('#ai-result').hide();
    }
    
    // 插入AI结果到编辑器
    function insertAIResult() {
        var result = $('#ai-result-content').html();
        editor.txt.append(result);
        hideAIResult();
    }
    
    // 灵感生成
    $('#ai-inspiration').click(function() {
        console.log('AI inspiration button clicked');
        var promptValue = prompt('请输入灵感生成的提示词：');
        console.log('Prompt value:', promptValue);
        if (promptValue === null) {
            console.log('User cancelled prompt dialog');
            return;
        }
        
        // 显示加载提示
        $('#ai-loading').show();
        $('#ai-result').hide();
        
        dtajax.post({
            url: "/post/ai/generate-inspiration",
            data: {prompt: promptValue}
        }).done(function(data) {
            console.log('AI灵感生成成功:', data);
            if (data.error) {
                toastr.error('AI灵感生成失败: ' + data.error);
            } else {
                showAIResult(data.result);
            }
        }).fail(function(xhr, status, error) {
            console.log('AI灵感生成失败 - status:', status);
            console.log('AI灵感生成失败 - error:', error);
            console.log('AI灵感生成失败 - xhr:', xhr);
            console.log('AI灵感生成失败 - responseText:', xhr.responseText);
            var errorMsg = xhr.responseJSON ? xhr.responseJSON.error : error || "灵感生成失败！";
            toastr.error(errorMsg);
        }).always(function() {
            // 隐藏加载提示
            $('#ai-loading').hide();
        });
    });
    
    // 内容续写
    $('#ai-continue').click(function() {
        console.log('AI continue button clicked');
        var existingContent = editor.txt.text();
        console.log('Existing content:', existingContent);
        var promptValue = prompt('请输入续写的提示词：');
        console.log('Prompt value:', promptValue);
        if (promptValue === null) {
            console.log('User cancelled prompt dialog');
            return;
        }
        
        // 显示加载提示
        $('#ai-loading').show();
        $('#ai-result').hide();
        
        dtajax.post({
            url: "/post/ai/continue-content",
            data: {existing_content: existingContent, prompt: promptValue}
        }).done(function(data) {
            console.log('AI内容续写成功:', data);
            if (data.error) {
                toastr.error('AI内容续写失败: ' + data.error);
            } else {
                showAIResult(data.result);
            }
        }).fail(function(xhr, status, error) {
            console.log('AI内容续写失败 - status:', status);
            console.log('AI内容续写失败 - error:', error);
            console.log('AI内容续写失败 - xhr:', xhr);
            console.log('AI内容续写失败 - responseText:', xhr.responseText);
            var errorMsg = xhr.responseJSON ? xhr.responseJSON.error : error || "内容续写失败！";
            toastr.error(errorMsg);
        }).always(function() {
            // 隐藏加载提示
            $('#ai-loading').hide();
        });
    });
    
    // 结构优化
    $('#ai-structure').click(function() {
        var content = editor.txt.text();
        if (!content) {
            toastr.warning('请先在编辑器中输入内容！');
            return;
        }
        
        // 显示加载提示
        $('#ai-loading').show();
        $('#ai-result').hide();
        
        dtajax.post({
            url: "/post/ai/optimize-structure",
            data: {content: content}
        }).done(function(data) {
            showAIResult(data.result);
        }).fail(function(error) {
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "结构优化失败！";
            toastr.error(errorMsg);
        }).always(function() {
            // 隐藏加载提示
            $('#ai-loading').hide();
        });
    });
    
    // AI润色
    $('#ai-polish').click(function() {
        var content = editor.txt.text();
        if (!content) {
            toastr.warning('请先在编辑器中输入内容！');
            return;
        }
        
        // 显示加载提示
        $('#ai-loading').show();
        $('#ai-result').hide();
        
        dtajax.post({
            url: "/post/ai/polish-content",
            data: {content: content}
        }).done(function(data) {
            showAIResult(data.result);
        }).fail(function(error) {
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "AI润色失败！";
            toastr.error(errorMsg);
        }).always(function() {
            // 隐藏加载提示
            $('#ai-loading').hide();
        });
    });
    
    // 回复模板
    $('#ai-reply').click(function() {
        var context = prompt('请输入回复的上下文或场景：');
        if (context === null) return;
        
        // 显示加载提示
        $('#ai-loading').show();
        $('#ai-result').hide();
        
        dtajax.post({
            url: "/post/ai/generate-reply-template",
            data: {context: context}
        }).done(function(data) {
            showAIResult(data.result);
        }).fail(function(error) {
            var errorMsg = error.responseJSON ? error.responseJSON.message : error.message || "回复模板生成失败！";
            toastr.error(errorMsg);
        }).always(function() {
            // 隐藏加载提示
            $('#ai-loading').hide();
        });
    });
    
    // 关闭AI结果
    $('#close-ai-result').click(hideAIResult);
    
    // 插入AI结果到编辑器
    $('#insert-ai-result').click(insertAIResult);

    // 提交按钮单击事件
    $("#submit-btn").click(function (event) {
        event.preventDefault();
        console.log('Submit button clicked');
        var title = $("input[name='title']").val();
        var board_id = $("select[name='board_id']").val();
        var content = editor.txt.html();
        
        console.log('Form data - title:', title);
        console.log('Form data - board_id:', board_id);
        console.log('Form data - content:', content);

        dtajax.post({
            url:"/post/public",
            data: {title, board_id, content}
        }).done(function(data){
            console.log('Post success:', data);
            toastr.success("发布成功！即将跳转到首页...");
            setTimeout(function(){
                window.location = "/";
            }, 2000);

        }).fail(function(xhr, status, error){
            console.log('Post failure - status:', status);
            console.log('Post failure - error:', error);
            console.log('Post failure - xhr:', xhr);
            console.log('Post failure - responseText:', xhr.responseText);
            
            // 更完善的错误处理
            var errorMsg = "发布失败！";
            if (xhr.responseJSON) {
                if (xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                } else {
                    errorMsg = JSON.stringify(xhr.responseJSON);
                }
            } else if (error) {
                errorMsg = error;
            } else if (xhr.statusText) {
                errorMsg = xhr.statusText;
            }
            
            toastr.error(errorMsg);
        });
    });
});
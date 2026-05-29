// 雪花对象
function Snowflake() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 0;
    this.opacity = 0;
    this.windOffset = 0;
    this.windSpeed = 0;
    this.randomness = 0;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.reset();
}

// 重置雪花属性
Snowflake.prototype.reset = function() {
    this.x = Math.random() * window.innerWidth;
    this.y = -10;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = Math.random() * 0.6 + 0.4;
    this.radius = Math.random() * 4 + 1;
    this.opacity = Math.random() * 0.5 + 0.7;
    this.windOffset = Math.random() * Math.PI * 2;
    this.windSpeed = (Math.random() + 0.2) * 0.02;
    this.randomness = Math.random() * 0.03 + 0.005;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.01;
}

// 更新雪花位置
Snowflake.prototype.update = function(cardRects) {
    this.vx += (Math.random() - 0.5) * this.randomness + Math.sin(this.windOffset) * 0.01;
    this.vy += (Math.random() - 0.5) * this.randomness * 0.3;
    
    this.windOffset += this.windSpeed;
    this.rotation += this.rotationSpeed;
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.vx = Math.max(-1, Math.min(1, this.vx));
    this.vy = Math.max(0.4, Math.min(1.0, this.vy));
    
    if (this.y > window.innerHeight || this.x < -50 || this.x > window.innerWidth + 50) {
        this.reset();
    }
}

// 渲染雪花
Snowflake.prototype.render = function(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // 绘制圆形雪花
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.fill();
    
    // 添加中心亮点
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.9})`;
    ctx.fill();
    
    ctx.restore();
}

// 雪堆对象
function SnowPile() {
    this.heights = [];
    this.initialize();
}

// 初始化雪堆高度
SnowPile.prototype.initialize = function() {
    this.heights = [];
    for (let i = 0; i < 100; i++) {
        this.heights.push(Math.random() * 15 + 5);
    }
}

// 渲染雪堆
SnowPile.prototype.render = function(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    ctx.beginPath();
    ctx.moveTo(0, window.innerHeight);
    
    const step = window.innerWidth / this.heights.length;
    
    for (let i = 0; i < this.heights.length; i++) {
        const x = i * step;
        const y = window.innerHeight - this.heights[i];
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevX = (i - 1) * step;
            const prevY = window.innerHeight - this.heights[i - 1];
            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + y) / 2);
        }
    }
    
    ctx.lineTo(window.innerWidth, window.innerHeight);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// 卡片/轮播图雪堆类
function CardSnowPile(cardRect) {
    this.cardRect = cardRect;
    this.snowHeights = [];
    this.initialize();
}

// 初始化卡片雪堆
CardSnowPile.prototype.initialize = function() {
    if (!this.cardRect) return;
    
    this.snowHeights = [];
    for (let i = 0; i < 50; i++) {
        this.snowHeights.push(Math.random() * 8 + 3);
    }
}

// 更新卡片雪堆
CardSnowPile.prototype.update = function(cardRect) {
    this.cardRect = cardRect;
    if (!this.cardRect) return;
    this.initialize();
}

// 渲染卡片雪堆
CardSnowPile.prototype.render = function(ctx) {
    if (!this.cardRect) return;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    
    const step = this.cardRect.width / this.snowHeights.length;
    
    ctx.beginPath();
    ctx.moveTo(this.cardRect.left, this.cardRect.top);
    
    for (let i = 0; i < this.snowHeights.length; i++) {
        const x = this.cardRect.left + i * step;
        const y = this.cardRect.top - this.snowHeights[i] * Math.sin(i * 0.3) * 0.5 - this.snowHeights[i];
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            const prevX = this.cardRect.left + (i - 1) * step;
            const prevY = this.cardRect.top - this.snowHeights[i - 1] * Math.sin((i - 1) * 0.3) * 0.5 - this.snowHeights[i - 1];
            const cpx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + y) / 2);
        }
    }
    
    ctx.lineTo(this.cardRect.right, this.cardRect.top);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// 简洁自然的结冰效果类
function SimpleIceEffect(cardRect) {
    this.cardRect = cardRect;
    this.frostPoints = [];
    this.initialize();
}

// 初始化结冰效果
SimpleIceEffect.prototype.initialize = function() {
    if (!this.cardRect) return;
    
    this.frostPoints = [];
    
    // 创建霜点，使用纯白色调
    for (let i = 0; i < 80; i++) {
        this.frostPoints.push({
            x: this.cardRect.left + Math.random() * this.cardRect.width,
            y: this.cardRect.top + Math.random() * 100,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.3
        });
    }
}

// 更新结冰效果
SimpleIceEffect.prototype.update = function(cardRect) {
    this.cardRect = cardRect;
    if (!this.cardRect) return;
    this.initialize();
}

// 渲染简洁结冰效果
SimpleIceEffect.prototype.render = function(ctx) {
    if (!this.cardRect) return;
    
    // 渲染纯白色霜点
    for (let point of this.frostPoints) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 主降雪效果类
function SnowEffect() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.snowflakes = [];
    this.snowPile = new SnowPile();
    this.cardSnowPiles = [];
    this.iceEffects = [];
    this.animationId = null;
    this.cardRects = [];
    this.globalWindSpeed = 0;
    
    this.initialize();
}

// 初始化
SnowEffect.prototype.initialize = function() {
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.opacity = '0.9';
    
    document.body.appendChild(this.canvas);
    
    this.resize();
    this.createSnowflakes();
    this.findCards();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
    
    setInterval(() => {
        this.globalWindSpeed = (Math.random() - 0.5) * 0.03;
    }, 3000);
}

// 查找所有需要添加雪堆的元素
SnowEffect.prototype.findCards = function() {
    const elements = [
        document.querySelector('#loginCarousel'),
        document.querySelector('.sign-box')
    ];
    
    this.cardRects = [];
    this.cardSnowPiles = [];
    this.iceEffects = [];
    
    for (let element of elements) {
        if (element) {
            const rect = element.getBoundingClientRect();
            this.cardRects.push(rect);
            this.cardSnowPiles.push(new CardSnowPile(rect));
            this.iceEffects.push(new SimpleIceEffect(rect));
        }
    }
}

// 调整canvas尺寸
SnowEffect.prototype.resize = function() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.snowPile.initialize();
    this.findCards();
}

// 创建雪花
SnowEffect.prototype.createSnowflakes = function() {
    const flakeCount = 150;
    for (let i = 0; i < flakeCount; i++) {
        this.snowflakes.push(new Snowflake());
    }
}

// 动画循环
SnowEffect.prototype.animate = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let flake of this.snowflakes) {
        flake.update(this.cardRects);
        flake.render(this.ctx);
    }
    
    this.snowPile.render(this.ctx);
    
    for (let cardSnowPile of this.cardSnowPiles) {
        cardSnowPile.render(this.ctx);
    }
    
    for (let iceEffect of this.iceEffects) {
        iceEffect.render(this.ctx);
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
}

// 启动效果
document.addEventListener('DOMContentLoaded', function() {
    new SnowEffect();
});
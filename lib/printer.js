var iconv = require('iconv-lite'),
    cmds = require('./commands'),
    node_printer = require("printer"),
    BufferHelper = require('bufferhelper');

/**
 * 打印任务
 * @param  {string}   printer_name 打印机名
 * @param  {function} callback     function(err,msg),当获取打印机后执行,如果不存在指定打印机，返回err信息
 */
var printer = function(printer_name, callback) {
    if (!printer_name) {
        printer_name = node_printer.getDefaultPrinterName();
    }
    this.printer = printer_name;
    try {
        node_printer.getPrinter(this.printer);
    } catch (err) {
        if (callback) callback.call(this, err, 'Can\'t find the printer');
        return false;
    }
    this._queue = new BufferHelper();
    this._writeCmd('INITIAL_PRINTER');
    this._writeCmd('CHN_TEXT');
    if (callback) callback.call(this, null, 'Get printer success');
}

printer.prototype = {
    /**
     * 打印文字
     * @param  {string} text    文字内容
     * @param  {boolen} inline  是否换行
     * @return {object}         当前对象
     */
    text: function(text, inline) {
        if (text) {
            this._queue.concat(iconv.encode(text, 'GBK'));
            if (!inline) this._writeCmd('NEW_LINE');
        }
        return this;
    },
    /**
     * 打印空行
     * @param  {number} number 行数
     * @return {object}        当前对象
     */
    line: function(number) {
        number = number || 1;
        for (var i = 0; i < number; i++) {
            this._writeCmd('NEW_LINE');
        }
        return this;
    },
    /**
     * 设置对其
     * @param  {string} align 居中类型,L/C/R
     * @return {object}       当前对象
     */
    setAlign: function(align) {
        this._writeCmd('TXT_ALIGN_' + align.toUpperCase());
        return this;
    },
    /**
     * 设置字体
     * @param  {string} family A/B/C/D/E
     * @return {object}        当前对象
     */
    setFont: function(family) {
        this._writeCmd('TXT_FONT_' + family.toUpperCase());
        return this;
    },
    /**
     * 设置行距
     * @param {number} hex 16进制数据,如'\x05'
     */
    setLineheight: function(hex) {
        this._writeCmd('LINE_HEIGHT');
        if (hex) {
            //console.log('\x1b\x33'+hex);
            this._queue.concat(new Buffer('\x1b\x33' + hex));
            //设置默认行间距
        }
        return this;
    },
    /**
     * 设置格式（加粗，下拉）
     * @param  {string} type B/U/U2/BU/BU2
     * @return {object}      当前对象
     */
    setStyle: function(type) {
        switch (type.toUpperCase()) {
            case 'B':
                this._writeCmd('TXT_UNDERL_OFF');
                this._writeCmd('TXT_BOLD_ON');
                break;
            case 'U':
                this._writeCmd('TXT_BOLD_OFF');
                this._writeCmd('TXT_UNDERL_ON');
                break;
            case 'U2':
                this._writeCmd('TXT_BOLD_OFF');
                this._writeCmd('TXT_UNDERL2_ON');
                break;
            case 'BU':
                this._writeCmd('TXT_BOLD_ON');
                this._writeCmd('TXT_UNDERL_ON');
                break;
            case 'BU2':
                this._writeCmd('TXT_BOLD_ON');
                this._writeCmd('TXT_UNDERL2_ON');
                break;
            case 'NORMAL':
            default:
                this._writeCmd('TXT_BOLD_OFF');
                this._writeCmd('TXT_UNDERL_OFF');
                break;
        }
        return this;
    },
    /**
     * 设定字体尺寸
     * @param  {string} size  2/null
     * @return {object}       当前对象
     */
    setSize: function(size) {
        this._writeCmd('TXT_NORMAL');
        this._writeCmd('LINE_HEIGHT');
        if (size == 2) {
            this._writeCmd('TXT_2WIDTH');
            this._writeCmd('TXT_2HEIGHT');
            this._writeCmd('LINE_HEIGHT_B');
        }
        return this;
    },
    /**
     * 二维码
     * @param  {string} code     打印内容
     * @param  {string} type     打印类型，UPC-A(11-12)/UPC-E(11-12，不可用)/EAN13(默认,12-13)/EAN8(7-8)/CODE39(1-255，不可用)/ITF(1-255偶数,不可用)/NW7(1-255，不可用)
     * @param  {number} width    宽度
     * @param  {number} height   高度
     * @param  {string} position OFF/ABV/BLW/BTH
     * @param  {string} font     字体A/B
     * @return {object}          当前对象
     */
    barcode: function(code, type, width, height, position, font) {
        if (width >= 1 || width <= 255) {
            this._writeCmd('BARCODE_WIDTH');
        }
        if (height >= 2 || height <= 6) {
            this._writeCmd('BARCODE_HEIGHT');
        }
        this._writeCmd('BARCODE_FONT_' + (font || 'A').toUpperCase());
        this._writeCmd('BARCODE_TXT_' + (position || 'BLW').toUpperCase());
        this._writeCmd('BARCODE_' + ((type || 'EAN13').replace('-', '_').toUpperCase()));
        this._queue.concat(new Buffer(code));
        return this;
    },
    /**
     * 打开钱箱
     * @return {object} 当前对象
     */
    openCashbox: function() {
        this._writeCmd('CASHBOX_OPEN');
        return this;
    },
    /**
     * 编译指定语法字符串为print方法
     * @param  {string} string 语法字符串
     * @return {object}        当前对象
     */
    compile: function(string) {
        if (typeof string != 'string') {
            console.log('必须为字符串');
            return this;
        }
        var _this = this;
        //替换换行
        var tpl = string.replace(/[\n\r]+/g, '/n')
            //替换函数
            .replace(/<%([\s\S]+?)%>/g, function(match, code) {
                return '",true);\n' + _this._renderFunc(code) + '\nobj.text("';
            })
            //替换换行
            .replace(/\/n/g, '");\nobj.text("');
        tpl = 'obj.text("' + tpl + '")';
        //console.log(tpl);
        new Function('obj', tpl).call(this, this);
        return this;
    },
    /**
     * 执行命令
     * @param  {string} cmd 命令名
     */
    _writeCmd: function(cmd) {
        if (cmds[cmd]) {
            this._queue.concat(new Buffer(cmds[cmd]));
        }
    },
    _renderFunc: function(string) {
        var _this = this,
            status = true;
        string = string.trim();
        //函数名生命
        var func = string.replace(/^([\S]+?):/, function(match, code) {
            var func_name = _this._escape(code);
            if (!_this[func_name]) {
                //无效函数
                status = false;
                console.log('解析模板出错没有名为' + func_name + '的方法');
            }
            return 'obj.' + func_name + ':';
            //函数变量
        }).replace(/:([\S]+?)$/, function(match, code) {
            var func_var = _this._escape(code).split(','),
                tpl_var = '';
            var length = func_var.length;
            for (var i = 0; i < length; i++) {
                tpl_var += '"' + func_var[i] + '",';
            }
            tpl_var = tpl_var.replace(/\,$/, '');
            return '(' + tpl_var + ');';
        });
        if (status) return func
        else return '';
    },
    /**
     * 预留跨域攻击防御
     * @param  {string} string 目标内容
     * @return {string}        转换后
     */
    _escape: function(string) {
        string = unescape(string.replace(/\u/g, "%u")); //转换unicode为正常符号
        string = string.replace(/[\<\>\"\'\{\}]/g, '');
        return string;
    },
    /**
     * 执行打印
     * @param  {Function} callback function(err,msg),当执行打印后，回调该函数，打印错误返回err信息
     */
    print: function(callback) {
        this._writeCmd('PAPER_CUTTING');
        this._writeCmd('INITIAL_PRINTER');
        this.sendCmd(callback);
    },
    /**
     * 发送命令
     * @param  {Function} callback function(err,msg),当执行打印后，回调该函数，打印错误返回err信息
     */
    sendCmd:function(callback){
        var _this = this;
        node_printer.printDirect({
            data: _this._queue.toBuffer(),
            printer: _this.printer,
            type: "RAW",
            success: function() {
                callback.call(_this, null, 'Printed successed');
                _this._queue.empty();
            },
            error: function(err) {
                callback.call(_this, null, 'Printed failed');
            }
        });
    },
    /**
     * 清空打印内容
     * @return {object} 当前对象
     */
    empty: function() {
        this._queue.empty();
        return this;
    }
}

module.exports = printer;
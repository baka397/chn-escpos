chn-escpos
=

## 介绍

chn-escpos是一个nodejs的window POS机打印程序,使用`printer`的C组件与打印机通信,使用ESC/POS命令控制打印机

### 更新日志
2016-04-18 1.1.1 修改setSize方法,并修复setSize(1)还原样式错误的问题.增加beep(打印机蜂鸣),qrcode(打印二维码)功能.  
2016-03-28 1.1.0 增加开钱箱命令,额外增加一个sendCmd命令,与开钱箱命令配合(print命令会额外发送一个切刀指令和初始化指令).与1.0.*的命令兼容 

## 安装

```
npm install chn-escpos --save
```

## 测试
你可以使用chn-escpos自带的测试程序进行测试
```
cd node_modules/chn-escpos
npm test
```
测试程序默认监听2520端口,你可以通过向`http://127.0.0.1:2520?action=print&printer=`POST raw数据进行打印测试(推荐使用POSTMAN进行测试)
```
//发送打印指令
POST  HTTP/1.1
Host: 127.0.0.1:2520?action=print
Content-Type: application/javascript
Cache-Control: no-cache
Postman-Token: 3ae7055f-8dd9-5386-3cfe-4355d7b7645a

[
    {
        "id": "1",//打印任务ID
        "group_id": "1",//打印队列ID
        "printer": "XP-80C",//打印机别名
        "content": "<% setAlign:c %>测试居中"
    }
]

//发送钱箱指令
POST  HTTP/1.1
Host: 127.0.0.1:2520?action=cmd
Content-Type: application/javascript
Cache-Control: no-cache
Postman-Token: d04979f1-9e17-3647-90be-defa7430109d

[
    {
        "id": "957",
        "group_id": "322",
        "printer": "XP-80C",
        "content": "<% openCashbox:'' %>"
    }
]
```
## 使用方法
```
var printer=require('chn-escpos'),
printer_name='XP-80C';
new printer(printer_name,function(err,msg){
    //调用this方法进行打印
});
```
### 打印方法
####text(text,[inline]) 打印文字内容
string `text`:打印内容,单行数据,如果超出自动换行  
boolen `inline`:是否自动换行,如果为true,则不会自动换行
```
this.text('测试打印');
```

####line(number) 空行  
number `number`:空行数  
```
this.line(2);
```

####setAlign(align) 设置对齐
string `align`:`C/L/R`分别代表居中/居左/居右,不区分大小写  
```
this.setAlign('c').text('这个是居中文字');
```

###setLineheight(hex) 设置行高
string `hex`:16进制数字,如'\x05'  
```
this.setLineheight('\x05');
```

###setStyle(type) 设置样式
string `type`:`B/U/U2/BU/BU2`分别代表加粗/下划线/下划线样式2/加粗+下划线/加粗+下划线样式2,不区分大小写  
```
this.setStyle('b').text('加粗');
```

###setSize(size) 设置文字大小
number `size`:4/3/2/1/null,x代表x倍字体,1/null均为正常
```
this.setSize(2).text('大字体');
```

###qrcode(text,size,lsb,msb) 打印二维码,需要打印机支持QRCODE条码类型,否则会打印乱码
string `text`:二维码内容  
string `size`:二维码大小,默认'\x06'  
string `lsb`:(text长度+3)%256转16进制后的字符,如'\x01'  
string `msb`:(text长度+3)/256取整转16进制后的字符,如'\x00'  
```
this.qrcode(1,'\x0f','\x04','\x00');
```
注:compile中16进制参数请使用\转义,如`<% qrcode:1,'\\x0f','\\x04','\\x00' %>` 

###beep(times,interval) 蜂鸣警报  
string `times`:蜂鸣次数,16进制,1-9.默认'\x09'  
string `interval`:蜂鸣间隔,16进制,实际间隔时间为interval*50ms,默认'\x01'  
```
this.beep();
```
注:compile中16进制参数请使用\转义,如`<% beep:'\\x03','\\x01' %>` 

###compile(string) 编译
string `string`:编译整个字符串  
使用<% 方法名:[参数] %>进行快速设置`\n`或`\r`表示换行.
```
this.compile('<% setAlign:c %><% setSize:2 %>这里开始是放大\n<% setSize:1 %>恢复正常大小');
```

###print(callback) 打印当前内容
function `callback`:回传err以及msg,当成功时,err为null  
```
this.print(function(err,msg){
   if(err){
    console.log('打印出错,回传信息:');
   }
   console.log(msg);
});
```
###empty() 清空当前内容
```
this.empty();
```

###openCashbox() 发送钱箱脉冲
钱箱脉冲不能同打印命令一同发送(钱箱脉冲命令会执行但不会进行打印)  
```
this.openCashbox();
```

###sendCmd(callback) 发送打印指令
function `callback`:回传err以及msg,当成功时,err为null  
```
this.sendCmd(function(err,msg){
   if(err){
    console.log('打印出错,回传信息:');
   }
   console.log(msg);
});
```
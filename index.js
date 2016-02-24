/**
 * 测试请求
 */

var url = require("url");
var querystring = require("querystring");

/**
 * 设置打印状态
 * @param  {Function} callback 回调函数，当打印成功后执行该函数
 */
function setPrinterStatus(callback){
	this.return_status=[];//返回状态
	this.return_list=[];//需返回的列表
	if(callback){
		this.callback=callback;
	}
}
setPrinterStatus.prototype={
	/**
	 * 增加状态列表
	 * @param  {object} data 增加数据
	 * @return {number}      列表编号
	 */
	addList:function(data){
		if(data){
			this.return_list.push(data);
		}else{
			this.return_list.push({});
		}
		return this.return_list.length-1;
	},
	/**
	 * 更新列表
	 * @param  {number} number 列表编号
	 * @param  {object} data   更新数据
	 * @return {boolen}        是否已全部更新
	 */
	updateList:function(number,data){
		this.return_status.push(1);
		for (var i in data) {
			if (data.hasOwnProperty(i)) {
				this.return_list[number][i] = data[i];
			}
       	}
       	if(this.return_status.length===this.return_list.length){
       		return true;
       	}else{
       		return false;
       	}
	},
	/**
	 * 获取列表
	 * @return {object} 列表数据
	 */
	getList:function(){
		return this.return_list;
	},
	callEnd:function(){
		if(this.callback){
			this.callback.call(this);
		}
	}
}

//http请求响应
var app = require('http').createServer(function(req,res){

	var objectUrl = url.parse(req.url);
	var objectQuery = querystring.parse(objectUrl.query);
	//接受数据
	var chunk='';
	req.on('data',function(data){
		chunk+=data;
	});
	//回传内容
	req.on('end', function(){
		var data={
			status:0
		}
		if(!objectQuery.action){
			data.msg='没有指定动作';
		}
		else if(chunk){
			switch(objectQuery.action){
				case 'print':
					var printer=require('./lib/printer.js');
					var print_data=JSON.parse(chunk);
					//生成回调函数
					var print_status=new setPrinterStatus(function(){
						data={
							status:1,
							msg:this.getList()
						}
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify(data));
					});
					//执行批量打印
					for(var i=0;i<print_data.length;i++){
						var list_number=print_status.addList({
							'id':print_data[i].id,
							'group_id':print_data[i].group_id
						});
						//添加返回列表
						new printer(print_data[i].printer,function(err,msg){
							//查找打印机出错
							if(err){
								print_status.updateList(list_number,{
									status:0,
									msg:msg+':'+err.toString()
								});
							//查找打印机成功
							}else{
								//开始打印
								this.compile(print_data[i].content).print(function(err,msg){
									//打印失败
									if(err){
										print_status.updateList(list_number,{
											status:0,
											msg:msg+':'+err.toString()
										});
									//打印成功
									}else{
										print_status.updateList(list_number,{
											status:1,
											msg:msg
										});
									}
								});
							}
						});
					}
					print_status.callEnd();
					break;
				default:
				data={
					status:0,
					msg:'错误的动作'
				}
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(data));
			}
		}else{
			data.msg='没有数据';
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(data));
		}
	});
});
app.listen(process.env.PORT || 2520,function(){
	console.log('打印测试程序已运行,请参考github说明测试打印');
});
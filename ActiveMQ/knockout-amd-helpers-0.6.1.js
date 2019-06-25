// knockout-amd-helpers 0.6.1 | (c) 2014 Ryan Niemeyer |  http://www.opensource.org/licenses/mit-license
define(["knockout",'base64','toast'], function(ko) {
	var self = this;
	var isWxPage = (window.location + '').indexOf('wx-') > 0;
	var client = isWxPage ? '/client': '';
	self.groupName = ko.observable();
	self.menuName = ko.observable();
	self.menus = ko.observableArray();
	self.userRealName = ko.observable('--');
	self.userDeptName = ko.observable('--');
	self.userDeptId = ko.observable('--');
	self.myMsgCount = ko.observable();
	self.hospitalName = ko.observable('--');
	self.hospitalCode = ko.observable('--');
	self.BPMN = ko.observable();
	self.userInfo = ko.observable();
	self.menuMap = ko.observable();
	self.isShowToDoTotal = ko.observable(false);
	ko.settings = ko.observable();
	ko.modalStatus = ko.observableArray();
	ko.canEditFishboneTreeFlag = ko.observable(null); //鱼骨图修改删除权限
	ko.newFactorsFlag = ko.observable(null); //鱼骨图的新增因素按钮显示
	ko.messages = ko.observableArray();
	ko.messageInfo = ko.observable();
	self.authRoleGroups = ko.observableArray();
	var existGroupIds = {};
	var base64 = new Base64();
	var leftmenu = $('.leftmenu').text();
	if (window.location.href[window.location.href.length-1] == '#') {
		window.location.href = window.location.href + '/ui/work_desktop';
	}
	if (leftmenu != '') {
		$.getJSON(getCtx() + '/auth/findMasUserAuthGroups', {},
		function(rsp) {
			self.menus(rsp.data);
			self.userRealName(rsp.extData.realName);
			self.userDeptName(rsp.extData.deptName);
			self.hospitalName(rsp.extData.hospitalName);
			self.hospitalCode(rsp.extData.hospitalCode);
			self.setMenuName(); // 同步菜单名称
			self.bindMenuUi();
			$.getJSON(getCtx() + '/systemRelated/getUser',
			function(r) {
				self.userInfo(r);
			});
			$.getJSON(getCtx() + '/msg/getMyNoReadMessageCount',
			function(r) {
				self.myMsgCount(r);
			});
			if (!isWxPage) self.connectStomp("ws://" + document.location.hostname + ":61614/", rsp.extData.userId);
		});
	};

	if (!isWxPage) {
		$.ajax({
			url: getCtx() + '/getMasHospitalCode',
			async: false,
			dataType: 'json',
			success: function(r) {
				if (r != null && r.split('@').length > 1) r = r.split('@')[0];
				self.BPMN(r);
				src = '';
				if (r == 'event-sdsykjtzyy') {
					$('#head_title').text('医疗安全(异常)事件管理系统');
				}
				if (r == 'event-lgfy') {
					src = 'apps/lib/images/logo.png';
				} else {
					$.ajax({
						url: 'apps/lib/images/' + r.replace(/event-/, '') + '-index-logo.png',
						type: 'GET',
						async: false,
						error: function() {
							src = 'apps/lib/images/logo-old.png';
						},
						success: function() {
							src = 'apps/lib/images/' + r.replace(/event-/, '') + '-index-logo.png';
						}
					});
				}
				$('#indexLogo').attr('src', src);
				$('#indexLogo').show();
			}
		});

		if (self.BPMN() == 'event-sxyy') {
			$('#modifyPwd').hide();
		}
	}

	//获取设置
	ko.getSettings = function() {
		$.ajax({
			url: getCtx() + client + '/systemRelated/getSettings',
			async: false,
			dataType: 'text',
			success: function(data) {
				data = data.replace(/(\/\/.*)|(\/\*[\s\S]*?\*\/)/g, '');
				data = ko.utils.parseJson(data);
				ko.settings(data);
			}
		});
	}
	ko.getSettings();

	ko.getSetting = function(name) {
		result = ko.settings()[name];
		return result === 'Y' ? true: (result === 'N' ? false: result);
	}

	{// 配置是否使用新日期选择器
		if (ko.getSetting('isUseNewDatePicker')) {
			$('body').append('<style>' +
			                     'input::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: auto; height: auto; color: transparent; background: transparent; }' +
			                     'input::-webkit-datetime-edit-year-field:focus { color: #555; background-color: #fff; }' +
			                     'input::-webkit-inner-spin-button { visibility: hidden; }' +
			                     'input::-webkit-clear-button { z-index: 1; margin-right: -15px; font-size: 16px; }' +
										'</style>');
		}
	}
	
	{// 是否允许修改接口内容
		if (!ko.getSetting('canModifyInterfaceContent')) {
			var loadedEventDefineId = null;
			var interfaceForm = [];
			var interfaceTable = [];
			var interValItem =  setInterval(function() {
				tSelf = window.topSelf;
				try {
					if (tSelf.eventForm && tSelf.eventForm() != null && tSelf.eventForm().eventDefineId != null 
							&& loadedEventDefineId != tSelf.eventForm().eventDefineId) {
						interfaceForm = [];
						interfaceTable = [];
						$.ajax({
							url: '/interface/findInterfacesByDefineId',
							data: {
								'defineId': tSelf.eventForm().eventDefineId
							},
							dataType: 'json',
							async: false,
							beforeSend: function() {
								ko.showLoading(false)
							},
							success: function(rsp) {
								loadedEventDefineId = tSelf.eventForm().eventDefineId;
								if(rsp.length != 0) {
									var selector = {
										form: '',
										table: ''
									};
									$.each(rsp, function(index, data) {
										var mapping = ko.utils.parseJson(data.mapping);
										$.each(mapping, function(mapIndex, mapData) {
											if(mapData.scope == 'FORM' ||
												((mapData.scope == null || mapData.scope == '') && data.scope == 'FORM')) {
												if (interfaceForm[mapData.elmtName] == null) interfaceForm[mapData.elmtName] = [];
												interfaceForm[mapData.elmtName].push(data);
											} else if(mapData.scope == 'TABLE' ||
												((mapData.scope == null || mapData.scope == '') && data.scope == 'TABLE')) {
												if (interfaceTable[mapData.elmtName] == null) interfaceTable[mapData.elmtName] = [];
												interfaceTable[mapData.elmtName].push(data);
											}
										});
									});
									
									
								}
							}
						});
					}
				} catch (e) {}
				//省医 护理类事件 可以切换患者类别 所以需要允许修改接口信息
				if(ko.getBpmn()=='event-hnsrmyy' &&  window.topSelf&&  window.topSelf.patTypeChangeElemts &&  window.topSelf.patTypeChangeElemts().length>0 && window.topSelf.isPatTypeBind && window.topSelf.isPatTypeBind() == false){
					window.topSelf.hn_hlPatChangeBind();
					return;
				}
				if( window.topSelf && window.topSelf.isPatTypeBind &&window.topSelf.isPatTypeBind() == true){
					return;
				}

				for (var i in interfaceForm) {
					$('[name="' + i + '"]').not('.report_0 [name="' + i + '"]').attr('disabled', true);
				}
				
				for (var i in interfaceTable) {
					$('table.pitaya-widget [name="' + i + '"]').not('.report_0 table.pitaya-widget [name="' + i + '"]').attr('disabled', true);
				}
			}, 100);
		}
	}

	ko.gotoHome = function() {
		self.menuName("");
		self.groupName("");
		window.location.href = '#ui/work_desktop';
	}

	ko.getBpmn = function() {
		if (self.BPMN() == null || self.BPMN() == '') {
			if (isWxPage) {
				$.ajax({
					url: getCtx() + '/getMasUserInfo',
					dataType: 'json',
					async: false,
					success: function(rsp) {
						self.BPMN(rsp != null ? rsp.BPMN_ID: null);
					}
				});
			} else {
				$.ajax({
					url: getCtx() + '/getMasHospitalCode',
					async: false,
					dataType: 'json',
					success: function(r) {
						if (r != null && r.split('@').length > 1) r = r.split('@')[0];
						self.setBpmn(r);
					}
				});
			}
		}
		return self.BPMN();
	}

	self.setBpmn = function(r) {
		self.BPMN(r);
		src = '';
		if (r == 'event-lgfy') {
			src = 'apps/lib/images/logo.png';
		} else {
			src = 'apps/lib/images/logo-old.png';
		}
		$('#indexLogo').attr('src', src);
		$('#indexLogo').show();
		self.setCookie('BPMN', r);
	}

	ko.loadCustomCode = function(key) {
		$.ajax({
			url: '/systemRelated/getMappingValue?_=' + new Date().getTime(),
			data: {'fileName': 'CUSTOM_CODE', 'key': key != null ? key : window.location.href.split('#')[1]},
			async: false,
			success: function(rsp) {
				console.log('执行JS代码：' + rsp);
				eval(rsp);
			}
		})
	}

	//连接ActiveMQ获取消息
	self.connectStomp = function(webSocketUrl, userId) {
		var stompUrl = webSocketUrl;
		var stompUserName = 'admin';
		var stompPassword = 'admin';
		var destination = "masMsg-" + userId;
		var client = Stomp.client(stompUrl);
		client.connect(stompUserName, stompPassword,
		function(frame) {
			client.subscribe(destination,
			function(activemqMessage) {
				var message = jQuery.parseJSON(activemqMessage.body);
				ko.messages.push(message);
				if ($('.jq-toast-wrap').length == 0) {
					self.showMessage();
				}
			});
		});
	}

	//弹出消息，同时只显示一条
	self.showMessage = function() {
		msg = ko.messages()[0];
		if (msg != null) {
			summary = msg.messageSummary;
			summary = summary.replace(/\n/g, '<br>');
			if (summary != null && summary.length > 130) {
				summary = summary.substring(0, 130) + '...';
			}
			summary = summary.replace(/ /g, "&nbsp;");
			ko.messageInfo(msg);
			$.toast({
				text: summary,
				hideAfter: 60000,
				showHideTransition: 'slide',
				position: 'bottom-right',
				icon: 'warning',
				afterHidden: function() {
					if (msg != null && !msg.isRead && msg.id != null && msg.id != '') {
						$.ajax({
							url: '/monitor/setMsgIsRead?id=' + msg.id,
							async: true,
							success: function(rsp) {
								if (rsp.success) {
									ko.reduceMsgCount();
								}
							}
						});
					}
					self.showMessage();
				}
			});
			ko.messages.shift();
		}
	}

	ko.viewMessage = function() {
		data = ko.messageInfo();
		if (!data.isRead && data.id != null && data.id != '') {
			$.ajax({
				url: '/monitor/setMsgIsRead?id=' + data.id,
				async: false,
				success: function(rsp) {
					if (rsp.success) {
						ko.reduceMsgCount();
					}
				}
			});
		}
		$('.close-jq-toast-single').trigger('click');
		//		$('#view_message_index').modal('show');
	}

	self.setMenuName = function() {
		var split = window.location.href.split('#/');
		if (split.length == 1) {
			self.groupName(null);
			self.menuName(null);
		} else {
			if (split[1] == 'ui/work_desktop') return;
			var menuUrl = split[1].replace(/\//g, ':');
			var interval = setInterval(function() {
				if (self.menuMap() != null) {
					clearInterval(interval);
					val = self.menuMap()[menuUrl];
					if (val != null) {
						self.groupName(val.split(':')[0]);
						self.menuName(val.split(':')[1]);
					}
				}
			},
			10);
		}
	}
	ko.setMenuName = function(){
		setTimeout(self.setMenuName(),1000);
	}

	$('#helpHref').attr('href', document.URL.substring(0, document.URL.indexOf('index.html')) + (ko.getBpmn() == 'event-zryhyy' ? 'apps/views/help/zryhyy_help.html': 'apps/views/help/help.html'));

	//模态框显示时将id放入数组中，代表此模态框正显示
	$('div').on('show.bs.modal',
	function(e) {
		target = $(e.target);
		if (ko.utils.arrayIndexOf(ko.modalStatus(), target.attr('id')) == -1) {
			ko.modalStatus.push(target.attr('id'));
		}
		// console.log(ko.modalStatus());
	});

	//模态框隐藏时根据id从数组中移除
	$('div').on('hide.bs.modal',
	function(e) {
		target = $(e.target);
		var index = ko.utils.arrayIndexOf(ko.modalStatus(), target.attr('id'));
		if (index >= 0) ko.modalStatus().splice(index, 1);
		// console.log(ko.modalStatus());
	});

	ko.isExistModal = function(name) {
		return ko.utils.arrayIndexOf(ko.modalStatus(), name) != -1;
	}

	ko.getUserRealName = function() {
		return self.userRealName();
	};

	ko.getHospitalName = function() {
		return self.hospitalName();
	};

	ko.getHospitalCode = function() {
		return self.hospitalCode();
	};

	ko.getUserDeptName = function() {
		return self.userDeptName();
	};

	ko.getUserInfo = function() {
		return self.userInfo();
	}

	ko.reduceMsgCount = function() {
		if (self.myMsgCount() > 0) {
			self.myMsgCount(self.myMsgCount() - 1);
		}
	}

	// list的子集排序
	self.getMenuAuthRoleGroups = function() {
		$.each(self.menus(),
		function(index, menus) {
			var authRoleGroups = menus.role.authRoleGroups;
			for (var i = 0; i < authRoleGroups.length; i++) {
				var authRoleGroup = authRoleGroups[i];
				if (existGroupIds[authRoleGroup.groupId] != null) {
					continue;
				}
				existGroupIds[authRoleGroup.groupId] = 1;
				self.authRoleGroups.push(authRoleGroup);
				for (var j = 0; j < authRoleGroup.group.authGroupMenus.length; j++) {
					var authGroupMenu = authRoleGroup.group.authGroupMenus[j];
					var menu = authGroupMenu.menu;

					if (self.menuMap() == null) self.menuMap(new Object());
					var menuUrl = menu.menuUrl.replace(/\//g, ':');
					self.menuMap()[menuUrl] = authRoleGroup.group.groupName + ':' + menu.menuName;
			  if (menu.menuUrl.indexOf('method_') != -1&& false) {
						ko.utils.arrayRemoveItem(authRoleGroup.group.authGroupMenus, authGroupMenu);
						$.ajax({
							url: '/mas/dynmenu/getDynMenu?menuUrl=' + menu.menuUrl + '&ssAppId=1',
							dataType: 'json',
							async: false,
							success: function(rsp) {
								for (var m = 0; m < rsp.length; m++) {
									var Tem = rsp[m];
									var newAuthGroupMenu = {
										id: Tem.id,
										menu: Tem
									};
									authRoleGroup.group.authGroupMenus.push(newAuthGroupMenu);
								}
							}
						});
					}
				}
			}
		});
		return self.authRoleGroups().sort(function(left, right) {
			return left.group.orderNumber == right.group.orderNumber ? 0 : (left.group.orderNumber < right.group.orderNumber ? -1 : 1);
		});
	};

	// list的子集排序
	self.getSubMenus = function(menus) {
		return menus.sort(function(left, right) {
			return left.menu.orderNumber == right.menu.orderNumber ? 0 : (left.menu.orderNumber < right.menu.orderNumber ? -1 : 1);
		});
	};
	//曲阜--在事件处理菜单处显示待审数量
	self.getShowTotal = function(menus){
		return "";
		if(ko.getBpmn() != 'event-qfsrmyy' && ko.getBpmn() != 'event-hnsrmyy' && ko.getBpmn() != 'event-nbshzwyy' && ko.getBpmn() != 'event-fjykdxdyyy'){
			return "";
		}
		var first = ko.utils.arrayFirst(menus, function(el, index){
			return el.menu.menuUrl == 'event/report/1/-1/0/-1/-1'
		});
		if(first){
			return 'todo';
		}
		var tracking = ko.utils.arrayFirst(menus, function(el, index){
			return el.menu.menuUrl == 'event/report/2/-1/0/-1/-1'
		});
		if(tracking){
			return 'tracking';
		}
		return '';
	}

	self.getToDoTotal = function(data, type){
		var isLoad = self.getShowTotal(data.authGroupMenus);
		var total = 0;
		if(isLoad && isLoad !=''){
			var id = data.groupName;
			if(self.isShowToDoTotal() == false){
				var tem = setInterval(function(){
					self.changeTodoTotal(id);
				}, 5000);
				self.isShowToDoTotal(true);
			}
			
			$.ajax({
				url: getCtx() + 'event/findUserTodoTask',
				async: false,
				dataType: 'json',
				success: function(rsp) {
					if(type=='todo'){
						total = rsp.data.todoTotal;
					} else if(type=='tracking'){
						total = rsp.data.trackingTotal;
					}
					
				}
			});
		}
		return total;
	}

	self.changeTodoTotal = function(id){
		$.ajax({
			url: getCtx() + 'event/findUserTodoTask',
			async: false,
			dataType: 'json',
			success: function(rsp) {
				$('#'+id).find('span[class="todo badge"]').text(rsp.data.todoTotal);
				$('#'+id).find('span[class="tracking badge"]').text(rsp.data.trackingTotal);
			}
		});
	}
	self.bindMenuUi = function() {
		$(".menuson li").click(function() {
			$(".menuson li.active").removeClass("active");
			$(this).addClass("active");
		});

		$('.title').click(function() {
			var $ul = $(this).next('ul');
			$('dd').find('ul').slideUp();
			if ($ul.is(':visible')) {
				$(this).next('ul').slideUp();
			} else {
				$(this).next('ul').slideDown();
			}
		});
	}

	self.logout = function(isWxClient) {
		$.getJSON(getCtx() + '../logout', {},
		function(rsp) {
			if (isWxClient && isWxClient == '1') {
				var url = document.URL;
				location.href = url.substring(0, url.indexOf('mas')) + 'mas/public/wx_index.html';
			} else {
				location.href = 'public/index.html';
			}

		});
	}

	self.modifyPwdModal = function() {
		$("#modifyPwdModal").modal("show");
	}

	self.showModifyPwd = function(){
		$('#modifyPwd').show ();
		$('#modifyPwd').addClass('active');
		$('#userInfo').hide();
		$('#userInfo').removeClass('active');
	}

	self.showUserInfo = function(){
		$('#userInfo').show();
		$('#userInfo').addClass('active');
		$('#modifyPwd').hide();
		$('#modifyPwd').removeClass('active');
	}

	self.saveOrUpdUser = function() {
		var $el = $("#modifyPwdModal");
		var $Id = $el.find(".tab-content .active").attr("id");
		if ($Id == "userInfo") {
			if ($('input[name="userNo"]', $el).val() == '') {
				bootbox.alert("用户名不能为空");
				return;
			}
			if ($('input[name="realName"]', $el).val() == '') {
				bootbox.alert("姓名不能为空");
				return;
			}
			console.log(ko.getUserInfo())
			var result = ko.saveOrUpdate('/user/saveOrUpdate', self.userInfo());
			if (result) {
				self.userRealName(self.userInfo().realName);
				$.getJSON('/getMasUserInfo', {},
				function(rsp) {
					self.userInfo(rsp.user);
				});
				$('#modifyPwdModal').modal('hide');
			}
		} else {
			var oldPwd = $('input[name="oldPwd"]', $el).val();
			var password = $('input[name="password"]', $el).val();
			var password2 = $('input[name="password2"]', $el).val();
			if (oldPwd == '') {
				bootbox.alert("请填写旧密码");
				return;
			}
			if (password == '') {
				bootbox.alert("请填写新密码");
				return;
			}
			if (password2 == '') {
				bootbox.alert("请填写旧密码");
				return;
			}
			if (password != password2) {
				bootbox.alert("两个新密码不一致");
				return;
			}
			$.ajax({
				url: 'user/masUpdatePwd',
				data: {
					"oldPwd": oldPwd,
					"newPwd": password
				},
				success: function(rsp) {
					bootbox.alert('修改密码成功,请重新登陆!',
					function() {
						self.logout()
					});
				}
			});
		}
	}

	self.jumpToHome = function() {
		var split = window.location.href.split('#');
		if (split.length > 1) {
			window.location.href = split[0] + '#/ui/work_desktop';
			self.groupName(null);
			self.menuName(null);
		}
	}

	self.getNavInfo = function(id, menuName) {
		$('#ui-view').off();
		var groupName = $($('#' + id).parent().parent().parent()[0]).find('div').attr('id');
		self.groupName(groupName);
		self.menuName(menuName);
		setCookie('activeId', 'c' + id);
		setCookie('groupName', groupName);
		setCookie('menuName', menuName);
	};

	self.setCookie = function(cname, cvalue) {
		var expires = "expires=0";
		cvalue = base64.encode(cvalue);
		document.cookie = cname + "=" + cvalue + "; " + expires;
	};

	self.getCookie = function(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1);
			if (c.indexOf(name) != -1) return base64.decode(c.substring(name.length, c.length));
		}
		return null;
	}

	ko.canEditFishboneTree = function() { //鱼骨图的删除修改因素权限
		//系统变量 需要每次都获取
		if (ko.canEditFishboneTreeFlag() == null || ko.canEditFishboneTreeFlag()) {
			ko.canEditFishboneTreeFlag(false);
//			if (ko.getBpmn() == 'event-zryhyy' && ko.userInfo().user.authUserRoles[0].role.roleName == '超级管理员') {
//				ko.canEditFishboneTreeFlag(true); //中日的要超级管理员才有权限
//			};
			if (ko.getBpmn() == 'event-lj' && ko.userInfo().user.dept.path.indexOf(':2:') != -1) {
				ko.canEditFishboneTreeFlag(true); //廉江的是只能科室才有权限
			}
			if (ko.getBpmn() == 'event-lgfy' && ko.userInfo().user.authUserRoles[0].role.roleName == '系统管理员') {
				ko.canEditFishboneTreeFlag(true); //龙岗的是系统管理员才有权限
			}

			if (ko.getBpmn() == 'event-sxyy' && ko.userInfo().user != null && ko.userInfo().user.authUserRoles != null && (ko.userInfo().user.authUserRoles[0].roleId == 1486288737520 || ko.userInfo().user.authUserRoles[0].roleId == 1489389594995 || ko.userInfo().user.authUserRoles[0].roleId == 1481711633341)) {
				ko.canEditFishboneTreeFlag(true); //山西的是科主任跟智能科室有权限
			}

			if (ko.getBpmn() == 'event-whjswszx' && ko.userInfo().user.authUserRoles[0].role.roleName == '超级管理员') {
				ko.canEditFishboneTreeFlag(true); //武汉的是超级管理员
			};
			if (ko.getBpmn() == 'event-jsszlyy' && ko.userInfo().user.authUserRoles != null ) {
				var authUserRoles = new Array();
				authUserRoles = ko.userInfo().user.authUserRoles;
				$.each(authUserRoles,function(i,d){
					if(d.role.roleName == '护理部' || d.role.roleName == '超级管理员' || d.role.roleName == '管理员' || d.role.roleName.indexOf('职能科室') != -1){
						ko.canEditFishboneTreeFlag(true); //江苏的是超级管理员和职能科室
					}
				})
			};
			if(ko.getBpmn() == 'event-dysslyy' || ko.getBpmn() == 'event-qfsrmyy' || ko.getBpmn() == 'event-hnsjsby'){
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '职能科室') ko.canEditFishboneTreeFlag(true);
				});
			}
			if(ko.getBpmn() == 'event-hdfy' && ko.userInfo().deptName == '质量监控科'){
				ko.canEditFishboneTreeFlag(true);
			}
			if (ko.getBpmn() == 'event-hbykdxdsyy') {//河北四院
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '超级管理员' || d.role.roleName == '职能科室') ko.canEditFishboneTreeFlag(true);
				});
			};
			if(ko.getBpmn() == 'event-lcsy'){//聊城
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '超级管理员' || d.role.roleName == '职能科室') ko.canEditFishboneTreeFlag(true);
				});
			}
			if (ko.getBpmn() != 'event-hbykdxdsyy' && ko.getBpmn() != 'event-hnsjsby' && ko.getBpmn() != 'event-lgfy' && ko.getBpmn() != 'event-sxyy' && ko.getBpmn() != 'event-lj' &&  ko.getBpmn() != 'event-whjswszx' &&  ko.getBpmn() != 'event-jsszlyy' && ko.getBpmn() != 'event-dysslyy' && ko.getBpmn() != 'event-hdfy' && ko.getBpmn() != 'event-lcsy') {
				ko.canEditFishboneTreeFlag(true); //不是上面几个医院也能有权限
			}
		}
		return ko.canEditFishboneTreeFlag();
	}

	ko.getnewFactors = function() { //鱼骨图新增因素按钮权限
		if (ko.newFactorsFlag() == null) {
			ko.newFactorsFlag(false);
			//			if(ko.getBpmn() == 'event-lj' && ko.userInfo().user != null && ko.userInfo().user.dept != null && ko.userInfo().user.dept.path.indexOf(':2:')!=-1){
			//				ko.newFactorsFlag(true);
			//			};
//			if (ko.getBpmn() == 'event-zryhyy' && ko.userInfo().user.authUserRoles[0].role.roleName == '超级管理员') {
//				ko.newFactorsFlag(true); //中日的是超级管理员
//			};
			if (ko.getBpmn() == 'event-lgfy' && ko.userInfo().user.authUserRoles[0].role.roleName == '系统管理员') {
				ko.newFactorsFlag(true); //龙岗的是系统管理员
			};
			if (ko.getBpmn() == 'event-sxyy' && ko.userInfo().user != null && ko.userInfo().user.authUserRoles != null) {
				var authUserRoles = new Array();
				authUserRoles = ko.userInfo().user.authUserRoles;
				$.each(authUserRoles,function(i,d){
					 if (d.roleId == 1486288737520 || d.roleId == 1489389594995 || d.roleId == 1481711633341){
					 	ko.newFactorsFlag(true); //山西的是科主任跟智能科室有权限
					 }
				});
				
			};
			if (ko.getBpmn() == 'event-whjswszx' && ko.userInfo().user.authUserRoles[0].role.roleName == '超级管理员') {
				ko.newFactorsFlag(true); //武汉的是超级管理员
			};
			if (ko.getBpmn() == 'event-jsszlyy' && ko.userInfo().user.authUserRoles != null) {
				var authUserRoles = new Array();
				authUserRoles = ko.userInfo().user.authUserRoles;
				$.each(authUserRoles,function(i,d){
					if(d.role.roleName == '护理部' || d.role.roleName == '超级管理员' || d.role.roleName == '管理员' || d.role.roleName.indexOf('职能科室') != -1){
						ko.newFactorsFlag(true); //江苏的是超级管理员和职能科室
					}
				})
			};
			if(ko.getBpmn() == 'event-dysslyy'){
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '职能科室') ko.newFactorsFlag(true);
				});
			}
			if (ko.getBpmn() == 'event-hnsjsby') {
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '职能科室') ko.newFactorsFlag(true);
				});
			}
			
			if (ko.getBpmn() == 'event-hdfy' && ko.userInfo().deptName == '质量监控科'){
				ko.newFactorsFlag(true);//花都妇幼
			}
			
			if(ko.getBpmn() == 'event-lcsy'){//聊城
				var roleSet = ko.userInfo().user.authUserRoles;
				$.each(roleSet, function(i,d) {
					if(d.role.roleName == '超级管理员' || d.role.roleName == '职能科室') ko.newFactorsFlag(true);
				});
			}
			
			if (ko.getBpmn() != 'event-hnsjsby' && ko.getBpmn() != 'event-lgfy' && ko.getBpmn() != 'event-sxyy' &&  ko.getBpmn() != 'event-whjswszx' && ko.getBpmn() != 'event-jsszlyy' && ko.getBpmn() != 'event-dysslyy' && ko.getBpmn() != 'event-hdfy' && ko.getBpmn() != 'event-lcsy') {
				ko.newFactorsFlag(true); //不是上面几个医院也能有权限
			};


		}
		return ko.newFactorsFlag();
	}

	ko.isUseOldTable = function() {
		return ko.getBpmn() == 'event-lj' || ko.getBpmn() == 'event-ssyy';
	}

	ko.reasonAnalysisRequire = function(eventType, defineList) {
		var flag = true;

		if (ko.getBpmn() == 'event-lgfy' || ko.getBpmn() == 'event-gxykd' || ko.getBpmn() == 'event-hnsjsby') {
			flag = false;
		}

		flag ? $('#reasonAnalysis').addClass('required_widget') : $('#reasonAnalysis').removeClass('required_widget')
	}

	ko.treatmentMeasuresRequire = function(eventType, defineList) {
		var flag = true;
		if (ko.getBpmn() == 'event-lgfy') {
			flag = false;
		}

		flag ? $('#treatmentMeasures').addClass('required_widget') : $('#treatmentMeasures').removeClass('required_widget');
	}

	//helper functions to support the binding and template engine (whole lib is wrapped in an IIFE)
	var require = window.require || window.curl,
	unwrap = ko.utils.unwrapObservable,
	//call a constructor function with a variable number of arguments
	construct = function(Constructor, args) {
		var instance, Wrapper = function() {
			return Constructor.apply(this, args || []);
		};

		Wrapper.prototype = Constructor.prototype;
		instance = new Wrapper();
		instance.constructor = Constructor;

		return instance;
	},
	addTrailingSlash = function(path) {
		return path && path.replace(/\/?$/, "/");
	},
	isAnonymous = function(node) {
		var el = ko.virtualElements.firstChild(node);

		while (el) {
			if (el.nodeType === 1 || el.nodeType === 8) {
				return true;
			}

			el = ko.virtualElements.nextSibling(el);
		}

		return false;
	};

	//an AMD helper binding that allows declarative module loading/binding
	ko.bindingHandlers.module = {
		init: function(element, valueAccessor, allBindingsAccessor, data, context) {
			var extendedContext, disposeModule, value = valueAccessor(),
			options = unwrap(value),
			templateBinding = {},
			initializer = ko.bindingHandlers.module.initializer,
			disposeMethod = ko.bindingHandlers.module.disposeMethod;

			//build up a proper template binding object
			if (options && typeof options === "object") {
				templateBinding.templateEngine = options.templateEngine;

				//afterRender could be different for each module, create a wrapper
				templateBinding.afterRender = function() {
					var options = unwrap(valueAccessor());

					if (options && typeof options.afterRender === "function") {
						options.afterRender.apply(this, arguments);
					}
				};
			}

			//if this is not an anonymous template, then build a function to properly return the template name
			if (!isAnonymous(element)) {
				templateBinding.name = function() {
					var template = unwrap(value);
					return ((template && typeof template === "object") ? unwrap(template.template || template.name) : template) || "";
				};
			}

			//set the data to an observable, that we will fill when the module is ready
			templateBinding.data = ko.observable();
			templateBinding["if"] = templateBinding.data;

			//actually apply the template binding that we built. extend the context to include a $module property
			ko.applyBindingsToNode(element, {
				template: templateBinding
			},
			extendedContext = context.extend({
				$module: null
			}));

			//disposal function to use when a module is swapped or element is removed
			disposeModule = function() {
				//avoid any dependencies
				ko.computed(function() {
					var currentData = templateBinding.data();
					if (currentData) {
						if (typeof currentData[disposeMethod] === "function") {
							currentData[disposeMethod].call(currentData);
							currentData = null;
						}

						templateBinding.data(null);
					}
				}).dispose();
			};

			//now that we have bound our element using the template binding, pull the module and populate the observable.
			ko.computed({
				read: function() {
					//module name could be in an observable
					var initialArgs, moduleName = unwrap(value);

					//observable could return an object that contains a name property
					if (moduleName && typeof moduleName === "object") {
						//initializer/dispose function name can be overridden
						initializer = moduleName.initializer || initializer;
						disposeMethod = moduleName.disposeMethod || disposeMethod;

						//get the current copy of data to pass into module
						initialArgs = [].concat(unwrap(moduleName.data));

						//name property could be observable
						moduleName = unwrap(moduleName.name);
					}

					//if there is a current module and it has a dispose callback, execute it and clear the data
					disposeModule();

					//at this point, if we have a module name, then require it dynamically
					if (moduleName) {

						require([addTrailingSlash(ko.bindingHandlers.module.baseDir) + moduleName],
						function(mod) {
							//if it is a constructor function then create a new instance
							if (typeof mod === "function") {
								mod = construct(mod, initialArgs);
							} else {
								//if it has an appropriate initializer function, then call it
								if (mod && mod[initializer]) {
									//if the function has a return value, then use it as the data
									mod = mod[initializer].apply(mod, initialArgs || []) || mod;
								}
							}

							//update the data that we are binding against
							extendedContext.$module = mod;
							templateBinding.data(mod);
						});
					}
				},
				disposeWhenNodeIsRemoved: element
			});

			//optionally call module disposal when removing an element
			ko.utils.domNodeDisposal.addDisposeCallback(element, disposeModule);

			return {
				controlsDescendantBindings: true
			};
		},
		baseDir: "",
		initializer: "initialize",
		disposeMethod: "dispose"
	};

	//support KO 2.0 that did not export ko.virtualElements
	if (ko.virtualElements) {
		ko.virtualElements.allowedBindings.module = true;
	}

	//an AMD template engine that uses the text plugin to pull templates
	(function(ko, require) {
		//get a new native template engine to start with
		var engine = new ko.nativeTemplateEngine(),
		existingRenderTemplate = engine.renderTemplate,
		sources = {};

		engine.defaultPath = "views";
		engine.defaultSuffix = ".html";
		engine.defaultRequireTextPluginName = "text";

		//create a template source that loads its template using the require.js text plugin
		ko.templateSources.requireTemplate = function(key) {
			this.key = key;
			this.template = ko.observable(" "); //content has to be non-falsey to start with
			this.requested = false;
			this.retrieved = false;
		};

		ko.templateSources.requireTemplate.prototype.text = function(value) {

			//when the template is retrieved, check if we need to load it
			if (!this.requested && this.key) {
				var files = this.key.split(',');
				var resultFiles = [];
				for (var i = 0; i < files.length; i++) { // 根据工作流的名称，调用不同的页面，实现页面个性化需求
					var TEM = files[i].replace('${BPMN}', self.getCookie('BPMN'));
					resultFiles.push(TEM);
				}
				files = resultFiles;
				var mainPage = '';
				var modelCotent = '';
				for (var i = 0; i < files.length; i++) {
					var suffix = files[i] + engine.defaultSuffix
					var file = addTrailingSlash(engine.defaultPath) + suffix;
					var p = engine.defaultRequireTextPluginName + "!" + file;
					if (i == 0) {
						mainPage = p;
					} else {
						var p = 'pages/';
						if (getCtx() == '') p = '';
						var url = p + 'apps/' + file + '?d=' + new Date().getTime();
						if (url.indexOf('KO_IFRAME_') == -1) {
							modelCotent += ($.ajax({
								url: url,
								async: false
							})).responseText;
						}
					}
				}
				require([mainPage],
				function(templateContent) {
					this.retrieved = true;
					if ((templateContent + modelCotent).indexOf('ko-include') == -1) {
						this.template(templateContent + modelCotent);
					} else {
						var sources = $(($(templateContent + modelCotent)).find("ko-include"));
						var html = templateContent + modelCotent;
						//用map将include文件的html暂存  若出现一个路由include多个相同界面 不用多次请求
						var map = {};
						for (var i = 0; i < sources.length; i++) {
							var sourcesFile = $(sources[i]).attr('file');
							var source = $(sources[i]);
							var sourceHtml = '';
							for (var j = 0; j < files.length; j++) {
								if (files[j].indexOf('KO_IFRAME_') != -1 && files[j].indexOf(sourcesFile) != -1) {
									var p = 'pages/';
									if (getCtx() == '') p = '';
									var fileName = files[j].replace('KO_IFRAME_', '');
									var iframeContent = map[fileName];
									if (!iframeContent){
										var url = p + 'apps/views/' + fileName + '.html?d=' + new Date().getTime();
										iframeContent = ($.ajax({
											url: url,
											async: false
										})).responseText;
										map[fileName] = iframeContent;
									}
									sourceHtml = iframeContent;
									break;
								}
							}

							// sub include
							var subSources = $(($(sourceHtml)).find("ko-include"));
							for (var k = 0; k < subSources.length; k++) {
								var subSourcesFile = $(subSources[k]).attr('file');
								var subSource = $(subSources[k]);
								var subSourceHtml = '';
								for (var j = 0; j < files.length; j++) {
									if (files[j].indexOf('KO_IFRAME_') != -1 && files[j].indexOf(subSourcesFile) != -1) {
										var p = 'pages/';
										if (getCtx() == '') p = '';
										var url = p + 'apps/views/' + files[j].replace('KO_IFRAME_', '') + '.html?d=' + new Date().getTime();
										var iframeContent = ($.ajax({
											url: url,
											async: false
										})).responseText;
										subSourceHtml = iframeContent;
										break;
									}
								}
								sourceHtml = sourceHtml.replace($(subSource[k]).prop('outerHTML'), subSourceHtml);
							}
							html = html.replace($(sources[i]).prop('outerHTML'), sourceHtml);
						}
						this.template(html);
					}

				}.bind(this));

				this.requested = true;
			}

			//if template is currently empty, then clear it
			if (!this.key) {
				this.template("");
			}
			//always return the current template
			if (arguments.length === 0) {
				return this.template();
			}
		};

		//our engine needs to understand when to create a "requireTemplate" template source
		engine.makeTemplateSource = function(template, doc) {
			var el;

			//if a name is specified, then use the
			if (typeof template === "string") {
				//if there is an element with this id and it is a script tag, then use it
				el = (doc || document).getElementById(template);

				if (el && el.tagName.toLowerCase() === "script") {
					return new ko.templateSources.domElement(el);
				}

				//otherwise pull the template in using the AMD loader's text plugin
				if (! (template in sources)) {
					sources[template] = new ko.templateSources.requireTemplate(template);
				}

				//keep a single template source instance for each key, so everyone depends on the same observable
				return sources[template];
			}
			//if there is no name (foreach/with) use the elements as the template, as normal
			else if (template && (template.nodeType === 1 || template.nodeType === 8)) {
				return new ko.templateSources.anonymousTemplate(template);
			}
		};

		//override renderTemplate to properly handle afterRender prior to template being available
		engine.renderTemplate = function(template, bindingContext, options, templateDocument) {
			var templateSource = engine.makeTemplateSource(template, templateDocument),
			existingAfterRender = options && options.afterRender;

			//wrap the existing afterRender, so it is not called until template is actuall retrieved
			if (typeof existingAfterRender === "function" && templateSource instanceof ko.templateSources.requireTemplate && !templateSource.retrieved) {
				options.afterRender = function() {
					if (templateSource.retrieved) {
						existingAfterRender.apply(this, arguments);
					}
				};
			}

			return engine.renderTemplateSource(templateSource, bindingContext, options);
		};

		//expose the template engine at least to be able to customize the path/suffix/plugin at run-time
		ko.amdTemplateEngine = engine;

		//make this new template engine our default engine
		ko.setTemplateEngine(engine);

	})(ko, require);
});
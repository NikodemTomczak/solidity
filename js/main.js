$(function () { 
// assign from config the service contract to a variable 
var aliasService = web3.eth.contract(dappConfig.abi_aliasService()).
				at(dappConfig.address_aliasService());
contract = aliasService;
var account;
//Initialize application
app_init();		
// Set up UI and web3 provider. 
// Check network, account, setup event monitoring.
// Retrieve users alias list.

function app_init() {
	// intitial button states
	$('#transaction_modal').on('hide.bs.modal', function () {
 		window.location.reload(true);
	});
	updateBtns([1,2,3], [true, true, true], ['<i class="fa fa-spinner fa-spin"></i>  Checking wallet','<i class="fa fa-spinner fa-spin"></i>  Checking wallet','<i class="fa fa-spinner fa-spin"></i>  Checking wallet']);
		  	
	// display addresses
	$('.dapp_address').html(addr_mod(dappConfig.address_aliasService(), (dappConfig.address_aliasService()).length,0,0, true));
	
	//hide user lists
	$('.no_permission').hide();
	$('.alias_list_user').hide();

	//check if web3 is injected		
	if (typeof(web3) === "undefined") {
   		error(fawe.danger+ ' Unable to connect to Ethereum.');
  		$('.main-window').hide();
  		$('.error-window').show();
	} else {
		
    	web3 = new Web3(window.web3.currentProvider);
		$('.error-window').hide();
		$('.main-window').show();
	}
	// if web3 is found, check current network ID
	if (web3) {	
		//check network ID -> should be Ropsten for beta
		web3.version.getNetwork(function (err, netId) {
  		switch (netId) {
    	case "1":
      		error(fawe.danger + ' Mainnet detected. Please switch to Ropsten.')
		  	updateBtns([1,2,3], [true, true, true], ['Set alias','Set price','Get permission']);
				
			break
    	case "3":
      		log(fawe.okay+ ' Network: Ropsten.')
		  	// fetch number of tokens sold from the tokenSale contract
			updateBtns([1,2,3], [false,false,false], ['Set alias','Set price','Get permission']);
		  	break
    	default:
     		error(fawe.danger+' Unknown network. Switch to Ropsten.')
			updateBtns([1,2,3], [true, true, true], ['Set alias','Set price','Get permission']);

				
	  	}
		});		
	}	
	// get curren taccount and setup up change monitoring
	web3.eth.getAccounts(function (err, accounts) { 
	if (accounts.length >0) { 
		account = web3.eth.accounts[0];
		if (account){
			var accountInterval = setInterval(function() {
  				if (web3.eth.accounts[0] !== account) {
					updateBtns([1,2,3], [true, true, true], ['<i class="fa fa-spinner fa-spin"></i>  Checking wallet','<i class="fa fa-spinner fa-spin"></i>  Checking wallet','<i class="fa fa-spinner fa-spin"></i>  Checking wallet']);
					account = web3.eth.accounts[0];
					$('#account').html(addr_mod(account, 7,5,"...", false));
					window.location.reload();				
				}
			}, 100);
			
			$('#account').html(addr_mod(account, 7,5,"...", false));
			
			dapp.fee(function(response){
				$('.dapp_fee').html(100-response+ ' %');
			});
			dapp.getEthBalance(account, function(response){
				$('#eth_owned').text(response.toString().substring(0,10));
			}); 
			
		 	//monitor(); // set up event monitoring
			dapp.getUserIndexLength(function(response) {
				if(response > 1) {
					_userList = fetchUserList(response);
					Promise.all(_userList)
						.then(function(users_) {
							$('#select_user').html(displayUsers(users_));
						})
        		}
				else {
					
				}
			})
		
			dapp.isUser(account, function(response){
				if (response == true) {
				dapp.priceList(account, function(response) {
					$('.dapp_price').text(response+' ETH');
				});
				dapp.getAliasIndexLength(account, function(response){
				_aliasList = fetchAliasList(account, response);
				Promise
					.all(_aliasList)
					.then(function(aliases_) {
          				_addressList = fetchAddressList(account, aliases_);
						Promise
							.all(_addressList)
							.then(function(addresses_){
								$('.dapp_aliases').html(displayAliases(aliases_, addresses_));
						})
        			})
				});
				}
				else {
					console.log('No such user');	
				}
			});
		
		}
		else {
			error(fawe.danger+' No account detected. Unlock metamask.');	
		}
	}
	else {
		error(fawe.danger+' No access to accounts. Unlock Metamask.');
		error(err);
	}
})
}
         
// Add alias to list
$('#setAliasForm').submit(function (e) {
	e.preventDefault();
	var alias = $('#alias').val();
	var address = $('#eth_address').val();
	vadr = dappValidate.address("#eth_address", address, "Input a valid Ethereum address");
	valias = dappValidate.alias("#alias", alias, "Alias (from 4 to 32 letters)");
	
	if (vadr && valias){ 
		if(web3.eth.defaultAccount === undefined) {
			return error(fawe.danger+" No accounts found. Unlock MetaMask.");
		}
    	updateBtns([1,2,3], [true, true, true], ['<i class="fa fa-spinner fa-spin"></i>  Please wait...','Set price','Get permission']);
		dapp.setAlias(address, alias, '#transaction_modal', function(error){
		
			if (error.message.includes("User denied")) {
				updateBtns([1,2,3], [true, true, true], ['Transaction rejected on Metamask!','Set price','Get permission']);
				
				window.setTimeout(function() {
					updateBtns([1,2,3], [false, false, false], ['Get alias','Set price','Get permission']); }, 3000);
			} else {
            	console.log(error)
				window.setTimeout(function() {
					updateBtns([1,2,3], [false, false, false], ['Get alias','Set price','Get permission']); }, 3000);
            }
		
		});
    }
 });
	
$('#setPriceForm').submit(function (e) {
	e.preventDefault();
	var price = $('#price_eth').val();
	vprice = dappValidate.price('#price_eth', price, 0, 1, "Price out of range", true);
	if (vprice) { 
		if(web3.eth.defaultAccount === undefined) {
			return error(fawe.danger+" No accounts found. Unlock MetaMask.");
		}
		updateBtns([1,2,3], [true, true, true], ['Set alias','<i class="fa fa-spinner fa-spin"></i>  Please wait...','Get permission']);
		dapp.setPrice(price, '#transaction_modal', function(error) {
			if (error.message.includes("User denied")) {
				updateBtns([1,2,3], [true, true, true], ['Set alias','Transaction rejected on Metamask!','Get permission']);
				
				window.setTimeout(function() {
					updateBtns([1,2,3], [false, false, false], ['Set alias','Set price','Get permission']);}, 3000);
			} else {
            	console.log(error)
				window.setTimeout(function() {
					updateBtns([1,2,3], [false, false, false], ['Get alias','Set price','Get permission']); }, 3000);
            }
		});
	}
});
 
$('#getPermission').submit(function (e) {
	e.preventDefault();
	var _price = $('.price_user').text();
	console.log(_price);
	console.log(Number(_price));
	var namespace = $( "#select_user" ).val();
	vprice = dappValidate.price(null, _price, null, null, "Price not right", false);
	//validate before sending. Address first - if it fails, all fails
	if (vprice) { 
		if(web3.eth.defaultAccount === undefined) {
			return error(fawe.danger+" No accounts found. Unlock MetaMask.");
		}
		updateBtns([1,2,3], [true, true, true], ['Set alias','Set price','<i class="fa fa-spinner fa-spin"></i>  Please wait...']);
		
		dapp.approveAddress(namespace, _price, '#transaction_modal', function(error){
			if (error.message.includes("User denied")) {
					updateBtns([1,2,3], [true, true, true], ['Set alias','Set price','Transaction rejected on Metamask!']);
					window.setTimeout(function() {
						updateBtns([1,2,3], [false, false, false], ['Set alias','Set price','Get permission']);}, 3000);
			} 
			else {
				console.log(error);
				window.setTimeout(function() {
						updateBtns([1,2,3], [false, false, false], ['Set alias','Set price','Get permission']);}, 3000);
			}
		});
	}
});
	
$('#getDelegatedPermission').submit(function (e) {
	e.preventDefault();
	var price = $('.price_user_delegate').text();
	var namespace = $( "#select_user" ).val();
	var grantee = $("#eth_address_delegate").val();
	
	vprice = dappValidate.price(null, price, null, null, "Price not right", false);
	vnamespace = dappValidate.address("#select_user", namespace, "Not a valid address", false);
	vgrantee = dappValidate.address("#grantee_address",grantee, "Not a valid address", true);
	//validate before sending. Address first - if it fails, all fails
	if (vprice && vnamespace && vgrantee) { 
		if(web3.eth.defaultAccount === undefined) {
			return error(fawe.danger+" No accounts found. Unlock MetaMask.");
		}
		updateBtns([1,2,3,4], [true, true, true, true], ['Set alias','Set price','Get permission','<i class="fa fa-spinner fa-spin"></i>  Please wait...']);
	
		dapp.approveAddressDelegate(namespace, grantee, price, '#transaction_modal', function (error) {
			if (error.message.includes("User denied")) {
				updateBtns([1,2,3,4], [true, true, true, true], ['Set alias','Set price','Get permission','Transaction rejected on Metamask!']);
				window.setTimeout(function() {
					updateBtns([1,2,3,4], [false, false, false,false], ['Set alias','Set price','Get permission','Delegate permission']);}, 3000);

			} 
			else {
				window.setTimeout(function() {
					updateBtns([1,2,3,4], [false, false, false,false], ['Set alias','Set price','Get permission','Delegate permission']);}, 3000);
				console.log(error)
			}
		});
	}
});

$( "#select_user" ).change(function() {
	
    var str = "";
    namespace = $( "#select_user" ).val();
	console.log(namespace);
	if (!(namespace === 'Choose user')) {
		dapp.priceList(namespace, function(_res) {
			$('.price_user').text(_res);
			$('.price_user_delegate').text(_res);
		});
	dapp.permissions(namespace, account, function(res){
		if (res == true) {
			$('.no_permission').hide();
		$('.alias_list_user').show();
						
		dapp.getAliasIndexLength (namespace, function(resu){
			console.log(namespace, resu);
		_aliasUserList = fetchAliasList(namespace, resu);
			console.log(_aliasUserList);
		Promise.all(_aliasUserList)
						.then(function(aliasesUser_) {
          				_addressUserList = fetchAddressList(namespace, aliasesUser_);
						Promise.all(_addressUserList).then(function(addressesUser_){
							$('.dapp_user_aliases').html(displayAliases(aliasesUser_, addressesUser_));
						})
        			})
				});
		} else{	
			dapp.priceList(namespace, function(res) {
				$('.price_user').text(res);
				$('.price_user_delegate').text(res);
			});
			$('.no_permission').show();
			$('.alias_list_user').hide();
		}
	});
}
	else {
		$('.no_permission').hide();
		$('.alias_list_user').hide();
	}
  })
 
function monitor() {
	
	 gameGuessN.NewPlayer().watch(function (error, results) {
		 console.log('New event: NewPlayer:');
		 console.log(results);
		 if (results){
		 	newPlayer = results.args._newPlayer;
		 	console.log('New player: ' + newPlayer);
      		curr_num_players();
			 getBalances(account);
			 currGame().then(function(res){
				if ($('.dapp_curr_game')){
				$('.dapp_curr_game').text(res);
				}
			});
		 }
		 else {
			//	 
		 }
	 });
		 
    gameGuessN.Winner().watch(function (error, results) {
		console.log('New event: Winner:');
		 console.log(results);
		if(results) {
			curr_num_players();
			 getBalances(account);
			 currGame().then(function(res){
				if ($('.dapp_curr_game')){
				$('.dapp_curr_game').text(res);
				}
			});
        	winnerPlayer = results.args._player;
			if (winnerPlayer == account){
				log('Last game played: you won');
			}
			else {
				log('Last game played: you lost');
			}
		}else {
			//
		}
	
          });
 };
	
function fetchAddressList(_address, _aliases){
	let _addresses = [];
	for (let i=0; i < _aliases.length; i++) {
		_addresses.push(dapp.getAddress(
			_address, 
			$.trim(web3.toAscii(_aliases[i]).replace(/\u0000/g, '')))
		)
	}
	return _addresses;
}; 
function fetchAliasList(_address, length){
	let _aliases = [];
	for (let i=0; i < length; i++) {
		_aliases.push(dapp.getAlias(_address, i));
	}
	return _aliases;
}; 
function fetchUserList(length){
	let _users = [];
	for (let i=0; i < length; i++) {
		_users.push(dapp.getUser(i));
	}
	return _users;
}; 

	
function log(message) {
	$('#log').append($('<p>').addClass('text-success').html(message));
	$('#log').scrollTop($('#log').prop('scrollHeight'));
}
function error(message) {
	$('#log').append($('<p>').addClass('text-danger').html(message));
	$('#log').scrollTop($('#log').prop('scrollHeight'));
}
function addr_mod(str, start, end, s, isurl) {
	str_f = str.substr(0, start)+s+ str.substr(str.length-end, str.length)
if (!isurl) {
		return  str_f
			}
	else {
		return  '<a href="https://ropsten.etherscan.io/address/'+str+'" target="_blank">'+str_f+'</a>'
	}
}
function updateBtns(ids, states, labels) {
	let btns = [btn1= {
			 query: "#set_alias_btn",
			  label: "Set alias" },
			btn2= {
			 query: "#set_price_btn",
			  label: "Set price" },
			 btn3= {
			 query:	"#get_permission_btn",
			 label: "Get permission" },
			btn4 = {
				query: "#get_permission_delegated_btn",
				label: "Delegate permission"}
			]
	
	for (id in ids){
			$(btns[id].query).html(labels[id]);	
			$(btns[id].query).prop( "disabled", states[id] );
		}
	}
var dapp = (function() {
	return {
		getEthBalance: function(address, callback){
			try {
    			web3.eth.getBalance(address, function (error, wei) {
        			if (!error) {
						return callback(web3.fromWei(wei, 'ether'));	
          			}
					else {
						return callback(0);
					}
				});
			} 
			catch (err) {
				error(err);
				return  callback(0);
			}
		},
		aliasIndex: function(address, index) {
			
		},
		approveAddress: function(namespace, price, modal, callback){
			
			contract.approveAddress.sendTransaction(namespace, {value: web3.toWei(price, 'ether'), gas: 80000, gasPrice: 20000000000}, function (error, hash) {
				if (!error) {
					dapp.waitForTxReceipt(modal, hash);
				} else {
					callback(error);
				}
			});
		},
		approveAddressDelegate: function(namespace, grantee, price, modal, callback){
			contract.approveAddressDelegate.sendTransaction(namespace, grantee, {value: web3.toWei(Number(price), 'ether'), gas: 80000, gasPrice: 20000000000}, function (error, hash) {
			if (!error) {
				dapp.waitForTxReceipt(modal, hash);
			} else {
				callback(error);
			}
			});
		},
		fee: function(callback){
			try {
				contract.fee.call(function(err, res){
					if (err) {
						return callback(0);
					}
					if (res.toNumber()>0) {
						return callback(res.toNumber());
					}
					else {
						return callback(0);
					}
				});
			}
			catch (err) {
				error("GetDapp: "+err);
				return  callback(0);
			}
		},
	    getAddress: async function(address, alias){
			return new Promise((resolve, reject) => {
				contract.getAddress.call(address, alias, function(err, res){
					if (err) {
						console.log('Error - getAddress');
						resolve("");
					}
					if (res) {
						resolve(res);
					}
					else {
						resolve("");
					}
				});
			});
		},
        getAlias: async function(address, index){
			return new Promise((resolve, reject) => {
				contract.getAlias.call(address, index, function(err, res){
					if (err) {
						console.log('Error - get alias');
						resolve("");
					}
					if (res) {
						resolve (res);
					}
					else {
						resolve ("");
					}
				});
			});
		},
		
		getAliasIndexLength: function(address, callback){
			try {
				contract.getAliasIndexLength.call(address, function(err, result){
					if (err) {
						return callback(0);
					}
					if (result.toNumber()>0) {
						return callback(result.toNumber());
					}
					else {
						return callback(0);
					}
				});
			}
			catch (err) {    	
				error(err);
				return  callback(0);
			}
		},
        getUser: async function(index){
			return new Promise((resolve, reject) => {
				contract.getUser.call(index, function(err, res){
					if (err) {
						console.log('Error - getAddress');
						resolve("");
					}
					if (res) {
						resolve(res);
					}
					else {
						resolve("");
					}
				});
			});
	
		},
		
        getUserIndexLength : function(callback){
			try {
				contract.getUserIndexLength.call(function(err, res){
					if (err) {
						return callback(0);
					}
					if (res.toNumber()>0) {
						return callback(res.toNumber());
					}
					else {
						return callback(0);
					}
				});
			}
			catch (err) {
				error(err);
				return  callback(0);
			}
		},
	    isUser: function(address, callback){
			try {
				contract.isUser.call(address, function (err, result) {
      				if (err) {
	  					return callback(false);
	  				}
      				if (result == true){
		  				return callback(true);
		  			} 
	   				else {
		 				return callback(false);
	   				}
				});
			} 
			catch (err) {
				error(err);
				return  callback(0);
			}
		},
        permissions: function(namespace,address, callback){
			try {
				contract.permissions.call(namespace, address, function(err, res){
					if (err) {
						console.log('Error - fee');
						return callback(false);
					}
					if (res) {
						return callback(res);
					}
					else {
						return callback(false);
					}
				});
			}
			catch (err) {
				error("GetDapp: "+err);
				return callback(false);
			}
		},

		priceList: function(address, callback){
			try {
				contract.priceList.call(address,function(err, res){
					if (err) {
						console.log('Error - price');
						return callback(0);
					}
					if (res) {
						return callback(web3.fromWei(res, 'ether'));
					}
					else {
						return callback(0);
					}
				});
			}
			catch (err) {
				error("GetPrice: "+err);
				return  callback(0);
			}
		},
		removeAddress: function(address){
			
		},
        setAlias: function(address, alias, modal, callback){
			contract.setAlias.sendTransaction(address, alias, {gas: 200000, gasPrice: 20000000000,}, function (error, hash) {
				if (!error) {
					dapp.waitForTxReceipt(modal, hash);
					
				} 
				else {
					callback(error);	
		    	}
			});
		},
		
		setFee: function(uint256){
			
		},
        setPrice: function(price, modal, callback){
			contract.setPrice.sendTransaction(web3.toWei(price, 'ether'), {gas: 50000, gasPrice: 20000000000,}, function (error, hash) {
				if (!error) {
					dapp.waitForTxReceipt(modal ,hash);
					
				}	 
				else {
        			callback(error);
				} 
			});
		},
		
        userExists: function(address){
			
		},
		waitForTxReceipt: function(modal, txId) {
			$(modal).modal({
				keyboard: false,
				backdrop: 'static',
				show: true
			})
			web3.eth.getTransactionReceipt(txId, function (error, result) {
				if (error) {
					console.log(error);
					$(modal).modal('hide');
					return (error);
		 		}
		 		else {
			 		if (result === null) {
          				setTimeout(function () { dapp.waitForTxReceipt(modal,txId) }, 500);
			 		} else {
						$(modal).modal('hide');
						
					}
					return result;
		 		}
			});
		}
	}
})(web3, contract);
var dappValidate = (function () {
	return {
    	address: function(field, _address, msg, flag) {
			is = web3.isAddress(_address);
			if (flag){
				if(!is) {	
					$(field).addClass('text-danger');
				}
				else{
					$(field).removeClass('text-danger');
				}
			}
			return is;
		},
		alias: function(field, alias, msg){
			is = (alias.length <32 && alias.length >= 4);
			if (!is) {
				$(field).addClass('text-danger');
			}
			else{
				$(field).removeClass('text-danger');
			}
			return is;
		},
		price: function(field, price, min, max, msg, range){
			is = false;
			if(range) {
				is = (price >= min && price <= max);
				if (!is) {
					$(field).addClass('text-danger');
				}
				else{
					$(field).removeClass('text-danger');
				}
				return is;
			}
			else {
				return !isNaN(price);
			}
			return is;
		},
	}
})(web3);
var fawe = {danger: '<i class="fa fa-circle text-danger"></i>',success: '<i class="fa fa-circle text-success"></i>', okay : '<i class="fa fa-check text-success"></i>'};
	
function displayAliases (aliases, addresses) {
	console.log(aliases)
	var content = '<table class="small table table-striped table-hover"><thead><tr class="d-flex"><th scope="col" class="col-2">Alias</th><th class="col-10" scope="col">Address</th></tr></thead><tbody>'
	$.each(aliases, function (index, value) {
	   	content += '<tr class="d-flex"><td class="col-2">' + hexToHuman(value) + '</td><td class="col-10">'+ addr_mod(addresses[index], (addresses[index]).length,0,0, true)+'</td></tr>';
	});
	content += "</tbody></table>"
	return content;
}
	
function displayUsers (users) {
	var content = '<option>Choose user</option>'
	$.each(users, function (index, value) {
		if(!(value == account)){
			content += '<option>' + value + '</option>';
		}
	});
	return content;
}
	
function hexToHuman(hex){
	return $.trim(web3.toAscii(hex).replace(/\u0000/g, ''))	
}

});

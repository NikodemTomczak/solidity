pragma solidity ^0.4.24;

/**
 * Creator: Nikodem Tomczak 2018
 */
 
/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

 /**
 * @title AliasService
 * The AliasService provides basic alias service 
 * namespaced by owner's address.
 * Access to aliases can be granted to contracts 
 * via permission once a fee is paid to the alias owner. 
 * Alias contract owner takes a 10%, or less, cut.
 */
 
contract AliasService is Ownable {
    
    uint256 public fee;
    mapping (address => uint256) public priceList;
    mapping (address => bytes32[]) public aliasIndex ;
    mapping (address => mapping(address => bool)) public permissions;
    mapping (address => mapping(bytes32 => address)) private aliases;
    mapping (address => bool) public userExists;
    address[] private userIndex;
    

    event AliasSet(
        address _namespace,
        address _address,
        bytes32 _alias
    );
    event PriceChanged(
        address _namespace, 
        uint256 _price
    );
     event FeeChanged(
        uint256 _fee
    );
	
    event PermissionGranted(
        address _namespace,
        address _grantee
    );
    
    event DelegatedPermissionGranted(
        address _namespace,
        address _grantee,
        address _grantor
    );
    
    
   /**
   * @dev Throws if address 0x0.
   */
  modifier notNull(address _address) {
    require(_address != address(0));
    _;
  }
  
  modifier uExists(address _address){
      require(isUser(_address));
      _;
  }
  
  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return a / b;
  }

/* 
* Setting the alias for an address. 
* No duplicates allowed. If the alias exists the address is overwritten.
* Minimum length for alias set to 4 characters. Maximum is 32 (because bytes32).
*/

  function setAlias(address _address, bytes32 _alias) public notNull(_address) {
        
    if (_alias.length < 4) return;
    if (isUser(msg.sender) == false){ 
        userIndex.push(msg.sender);
        userExists[msg.sender] = true;
    }
     if (aliases[msg.sender][_alias] == 0){
    aliasIndex[msg.sender].push(_alias);
     }
    aliases[msg.sender][_alias] = _address;
   
    
	if (permissions[msg.sender][msg.sender] == false) {
		permissions[msg.sender][msg.sender] = true;
	}
    emit AliasSet(msg.sender, _address, _alias);
    
            
   }
  
  /*
   * Gets address from approved namespace correpsoning to an alias.
   * 
   */
   
 function getAddress(address _namespace, bytes32 _alias) public notNull(_namespace) uExists(_namespace) view returns (address _address) {
    if (permissions[_namespace][msg.sender] == true) {
            return aliases[_namespace][_alias];
    }
 }
 
 /*
  * Gets alias from a permitted namespace.
  * Used only for looping on the frontend.
  * 
  */
   
 function getAlias(address _namespace, uint256 _index) public notNull(_namespace) uExists(_namespace) view returns (bytes32 _alias) {
    if (permissions[_namespace][msg.sender] == true) {
            return aliasIndex[_namespace][_index];
    }
 }
  
  function() public payable { }
  
  /**
   * Grant permission to access alias list.
   * (price - fee) goes to list owner.
   * fee goes to contract owner
   */
   
  
  function approveAddress(address _namespace) public notNull(_namespace) uExists(_namespace) payable {

    require(msg.value >= priceList[_namespace]);
    permissions[_namespace][msg.sender] = true;
    _namespace.transfer(div(mul(msg.value,fee),100));
    
    emit PermissionGranted(_namespace, msg.sender);
    
    }
    
    /**
   * Grant permission to access alias list for a delegated account (can be contract).
   * (price - fee) goes to list owner.
   * fee goes to contract owner
   */
   
  
  function approveAddressDelegate(address _namespace, address _address) public notNull(_namespace) notNull(_address) uExists(_namespace) payable {

    require(msg.value >= priceList[_namespace]);
    permissions[_namespace][_address] = true;
    _namespace.transfer(div(mul(msg.value,fee),100));
    
    emit DelegatedPermissionGranted(_namespace, _address, msg.sender);
    
    }
  /*
   * Removing permission.
   * Only original requestor can remove.
   */
   
  function removeAddress(address _namespace)  public notNull(_namespace) uExists(_namespace) {
   permissions[_namespace][msg.sender] = false;
  }
  
  
  /*
   * Setting price in wei for accessing namespace.
   * Only prices lower that 1 Ether allowed
   */
   
  function setPrice(uint256 _price) public uExists(msg.sender){

    if (_price > 1000000000000000000) revert();
    priceList[msg.sender] = _price;
   
    emit PriceChanged(msg.sender, _price);
  }
  
  /*
  * Fee for accessing namespace. Max fee 10% can be set.
  */
  function setFee(uint256 _fee) onlyOwner public {
    if (_fee < 90) revert();
    fee = _fee;
     
    emit FeeChanged(fee);
  }
  
  function getUserIndexLength() public view returns (uint256) {
    return userIndex.length;
 }
 
 function getUser(uint256 index) public view returns (address) {
     
     return userIndex[index];
 }
 
 function getAliasIndexLength(address _namespace) public notNull(_namespace) view returns (uint256) {
    return aliasIndex[_namespace].length;
 }
 
 function isUser(address _namespace) public constant returns(bool isIndeed)
{
 if(userIndex.length == 0) return false;
 return (userExists[_namespace]);
}
  
  function transfer() onlyOwner public {
      msg.sender.transfer(address(this).balance);
  }
  
  constructor() public {
    priceList[msg.sender] = 1000000000000000; //0.001 Ether
    permissions[msg.sender][msg.sender] = true;
    fee = 90;
   }
  
}


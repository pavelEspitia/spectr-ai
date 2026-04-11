# @version ^0.3.7

# Intentionally vulnerable Vyper contract for testing spectr-ai

owner: public(address)
balances: public(HashMap[address, uint256])

@external
def __init__():
    self.owner = msg.sender

@external
@payable
def deposit():
    self.balances[msg.sender] += msg.value

# Vulnerability: reentrancy — sends ETH before updating state
@external
def withdraw():
    amount: uint256 = self.balances[msg.sender]
    raw_call(msg.sender, b"", value=amount)
    self.balances[msg.sender] = 0

# Vulnerability: no access control
@external
def drain():
    raw_call(self.owner, b"", value=self.balance)

# Vulnerability: no input validation
@external
def set_owner(new_owner: address):
    self.owner = new_owner

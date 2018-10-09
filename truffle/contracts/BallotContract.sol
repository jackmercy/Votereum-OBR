pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2; // Allow passing struct as argument

// We have to specify what version of compiler this code will compile with

contract BallotContract {


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Contract Constructor ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    address owner;
    uint256 storedAmount;

    /*
    * Modifier to only allow the owner to call a function.
    */
    modifier onlyOwner {
        require(msg.sender == owner );
        _;

    }

    /*
    *  This function is called *once* at first initialization into the blockchain.
    */
    constructor ()
    {
        owner = msg.sender;       // Set the owner to the address creating the contract.
        ballotName = 'Not set';
        limitCandidate = 0;

        startRegPhase = 0;
        endRegPhase = 0;
        startVotingPhase = 0;
        endVotingPhase = 0;

        isFinalized = false;
        registeredVoterCount = 0;
        votedVoterCount = 0;
        fundedVoterCount = 0;
        storedAmount = address(this).balance;
        amount = 0;

    }

    function close(bytes32 phrase) onlyOwner public {
        require( keccak256(phrase) == keccak256(bytes32('close')));
        require(storedAmount > 0);
        owner.transfer(storedAmount);
        selfdestruct(owner);
    }

    function () payable {
        storedAmount = msg.value;
    }

    function claimStoredAmount(bytes32 phrase) onlyOwner {
        require(now > endVotingPhase);
        require(storedAmount > 0);
        require(  keccak256(phrase) == keccak256(bytes32('claim')) );

        owner.transfer(storedAmount); // Transfer back remaining amount
    }


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Validator ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    function validTime() private view returns (bool) {
        if ( now > endVotingPhase || now < startVotingPhase)
            return false;
        return true;
    }

    function canVote(address voterAddress) private view returns (bool) {
        if (isFinalized == false)       // If the options are not finalized, we cannot vote.
            return false;

        if (voters[voterAddress].eligibleToVote == false)
            return false;

        if (voters[voterAddress].isVoted == true) // If the voter has already voted, voter cannot vote anymore
            return false;
        return true;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Ballot Options (Candidate) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //


    bytes32 ballotName; // The ballot candidateID.
    uint    limitCandidate;

    // Time: seconds since 1970-01-01
    uint    startRegPhase;
    uint    endRegPhase;
    uint    startVotingPhase;
    uint    endVotingPhase;

    // Ballot status
    bool    isFinalized;       // Whether the owner can still add voting options.
    uint    registeredVoterCount;   // Total number of voter addresses registered.
    uint    votedVoterCount;
    uint    fundedVoterCount;
    uint    amount; // in GWei

    //
    bytes32[] candidateIDs;
    mapping (bytes32 => address[]) voteReceived; //map candidateId to array of address of whom has voted for them

    function setupBallot (bytes32 _ballotName, uint _fundAmount, uint _limitCandidate,
        uint _startVotingPhase, uint _endVotingPhase,
                          uint _startRegPhase, uint _endRegPhase, bytes32[] _candidateIDs) onlyOwner public {

        ballotName = _ballotName;
        amount = _fundAmount*1000000000; //convert to wei
        limitCandidate = _limitCandidate;
        startRegPhase = _startRegPhase;
        endRegPhase = _endRegPhase;
        startVotingPhase = _startVotingPhase;
        endVotingPhase = _endVotingPhase;

        isFinalized = false;
        registeredVoterCount = 0;
        votedVoterCount = 0;
        fundedVoterCount = 0;
        storedAmount = address(this).balance;

        addCandidates(_candidateIDs);
    }

    function setTransferAmount(uint _amount) {
        amount = _amount*1000000000; //convert Gwei to wei
    }


    function addCandidates(bytes32[] _candidateIDs) onlyOwner public {
        require (now < endRegPhase, 'Ballot setup time has ended!');
        require (isFinalized == false);    // Check we are allowed to add options.

        candidateIDs = _candidateIDs;
    }

    /*
    *  Call this once all options have been added, this will stop further changes
    *  and allow votes to be cast.
    *  NOTE: this can only be called by the ballot owner.
    */
    function finalizeBallot(bytes32 phrase) onlyOwner public {
        require(candidateIDs.length > 2);
        require( keccak256(phrase) == keccak256(bytes32('finalize')));
        require (now < startVotingPhase);
        require (now > startRegPhase);

        isFinalized = true;    // Stop the addition of any more change.
    }

    function resetTime(bytes32 phrase) onlyOwner public returns(bool) {
        if (keccak256(phrase) == keccak256(bytes32('startRegPhase'))) {
            startRegPhase = 0;
        }
        if (keccak256(phrase) == keccak256(bytes32('endRegPhase'))) {
            endRegPhase = 0;
        }
        if (keccak256(phrase) == keccak256(bytes32('startVotingPhase'))) {
            startVotingPhase = 0;
        }
        if (keccak256(phrase) == keccak256(bytes32('endVotingPhase'))) {
            endVotingPhase = 0;
        }
        return keccak256(phrase) == keccak256(bytes32('startRegPhase'));
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Voting Options ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    /*
    *  Structure which represents a single voter.
    */
    struct Voter
    {
        bool eligibleToVote;    // Is this voter allowed to vote?
        bool isVoted;             // State of whether this voter has voted.
        bool isFunded;
        bytes32[] votedFor;          // List candidates' ID this voter voted for.
    }

    address[] voterAddressList;
    mapping(address => Voter) public voters; // State variable which maps any address to a 'Voter' struct.

    /*
    *  Allow an address (voter) to vote on this ballot.
    *  NOTE: this can only be called by the ballot owner.
    */
    function giveRightToVote(address _voter) onlyOwner public {
        require (now < endRegPhase, 'Ballot setup time has ended!');
        require(address(this).balance >= storedAmount);
        require(storedAmount > amount);

        voters[_voter].eligibleToVote = true;
        registeredVoterCount += 1;      // Increment registered voters.
        voterAddressList.push(_voter);

        // Fund user with money
        giveFund(_voter);

    }

    function giveFund(address _voter) onlyOwner private {
        require(voters[_voter].eligibleToVote); // User already had the right to vote
        require(address(this).balance >= storedAmount);
        require(!voters[_voter].isFunded);

        voters[_voter].isFunded = true;
        storedAmount -= amount;
        _voter.transfer(amount);
        fundedVoterCount += 1;
    }

    /*
    *  Allow an eligible voter to vote for their chosen votingOption.
    *
    *  NOTE: if anything fails during this call we will throw and automatically
    *        revert all changes.
    */
    function voteForCandidate(bytes32 _candidateID) private {
        require(validCandidate(_candidateID));
        votedVoterCount += 1;
        voters[msg.sender].votedFor.push(_candidateID); //Add candidateID to list whom voter voted
        voteReceived[_candidateID].push(msg.sender);
    }

    /*
    *  Allow an eligible voter to vote for a list of candidate
    *  If they have already isVoted, then remove their vote from the previous
    *  'votingOption' and assign it to the new one.
    *
    *  NOTE: if anything fails during this call we will throw and automatically
    *        revert all changes.
    */
    function voteForCandidates(bytes32[] _candidateIDs) public {
        // comment for function debug
        //require(validTime());
        //require(canVote(msg.sender));

        for (uint i = 0; i < _candidateIDs.length; i++) {
            voteForCandidate(_candidateIDs[i]);
            //emit VoteFor(msg.sender, _candidateIDs);
        }
        voters[msg.sender].isVoted = true;
    }

    function validCandidate(bytes32 _candidateID) public view returns (bool) {
        for (uint i = 0; i < candidateIDs.length; i++) {
            if (candidateIDs[i] == _candidateID) {
                return true;
            }
        }
        return false;
    }

    function hasRightToVote(address voterAddress) public view returns (bool) {
        if (voters[voterAddress].eligibleToVote && !voters[voterAddress].isVoted) {
            return true;
        } else {
            return false;
        }
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Getter Functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    /*
    * Returns the ballots bytes32.
    */
    function getBallotOverview() public returns (
        bytes32, uint, bool, uint, uint, uint, uint, uint, uint, uint, uint, uint
    ) {
        return ( // Do not change the return order
        /*Ballot Info*/
        ballotName,
        limitCandidate,
        isFinalized,
        amount,
        storedAmount,

        /*Phase Info*/
        startRegPhase,
        endRegPhase,
        startVotingPhase,
        endVotingPhase,

        /*Voter Info*/
        registeredVoterCount,
        votedVoterCount,
        fundedVoterCount
        );
    }

    /*
    * Returns the number of candidates.
    */
    function getCandidateLength() public returns (uint)  {
        return candidateIDs.length;
    }

    function getCandidateList() public returns (bytes32[]) {
        return candidateIDs;
    }

    /*    *//*
    * Returns the candidateID of a candidate at a specific index.
    * Throws if index out of bounds.
    *//*
    function getVotingOptionsName(uint _index) returns (bytes32)
    {
        return votingOptions[_index].candidateID;
    }*/

    /*
    * Returns the number of votes for a candidate at the specified index.
    * Throws if index out of bounds.
    */
    function getCandidateResult(bytes32 _candidateID) public returns (uint, address[])
    {
        return (voteReceived[_candidateID].length, voteReceived[_candidateID]);
    }

    // Return a list of people who have voted for candidate


    /*
    * Returns if the voting options have been finalized.
    */
    function isBallotFinalized() public returns (bool)
    {
        return isFinalized;
    }

    function getVotedForList(address voterAddress) public returns (bytes32[]) {
        return voters[voterAddress].votedFor;
    }

    function getVoterAddressList() onlyOwner public  returns (address[]) {
        return voterAddressList;
    }


}

pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2; // Allow passing struct as argument

// We have to specify what version of compiler this code will compile with

contract BallotContract {


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Contract Constructor ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    address owner;                  // The address of the owner. Set in 'Ballot()'



    /*
    * Modifier to only allow the owner to call a function.
    */
    modifier onlyOwner
    {
        require( msg.sender             == owner );
        _;

    }

    /*
    *  This function is called *once* at first initialization into the blockchain.
    */
    constructor ()
    {
        owner                   = msg.sender;       // Set the owner to the address creating the contract.
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Validator ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    function validTime() private view returns (bool) {
        if ( now > endVotingPhase || now < startVotingPhase)
            return false;
    }

    function canVote(Voter _voter) private view returns (bool) {
        if (isFinalized == false)       // If the options are not finalized, we cannot vote.
            return false;

        if (_voter.eligibleToVote == false)
            return false;

        if (_voter.isVoted == true) // If the voter has already voted, voter cannot vote anymore
            return false;
        return true;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Ballot Options (Candidate) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //


    bytes32  ballotName; // The ballot candidateID.

    // Time: seconds since 1970-01-01
    uint    startRegPhase;
    uint    endRegPhase;
    uint    startVotingPhase;
    uint    endVotingPhase;

    // Ballot status
    bool    isFinalized;       // Whether the owner can still add voting options.
    uint    registeredVoterCount;   // Total number of voter addresses registered.
    uint    votedVoterCount;

    //
    bytes32[] candidateIDs;
    mapping (bytes32 => address[]) voteReceived; //map candidateId to array of address that voted for them

    function setupBallot (bytes32 _ballotName, uint _startVotingPhase, uint _endVotingPhase,
                          uint _startRegPhase, uint _endRegPhase, bytes32[] _candidateIDs) onlyOwner public {

        require (now < _endRegPhase, 'Ballot setup time has ended!');
        require (isFinalized == false);

        ballotName = _ballotName;
        startRegPhase = _startRegPhase;
        endRegPhase = _endRegPhase;
        startVotingPhase = _startVotingPhase;
        endVotingPhase = _endVotingPhase;

        isFinalized = false;
        registeredVoterCount = 0;
        votedVoterCount = 0;

        addCandidates(_candidateIDs);
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
    function finalizeBallot() onlyOwner public
    {
        require(candidateIDs.length > 2);

        isFinalized = true;    // Stop the addition of any more change.
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Voting Options ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    /*
    *  Structure which represents a single voter.
    */
    struct Voter
    {
        bool eligibleToVote;    // Is this voter allowed to vote?
        bool isVoted;             // State of whether this voter has voted.
        bytes32[] votedFor;          // List candidates' ID this voter voted for.
    }
    mapping(address => Voter) public voters; // State variable which maps any address to a 'Voter' struct.

    /*
    *  Allow an address (voter) to vote on this ballot.
    *  NOTE: this can only be called by the ballot owner.
    */
    function giveRightToVote(address _voter) onlyOwner public
    {
        require (now < endRegPhase, 'Ballot setup time has ended!');
        voters[_voter].eligibleToVote = true;
        registeredVoterCount += 1;      // Increment registered voters.
    }

    /*
    *  Allow an eligible voter to vote for their chosen votingOption.
    *
    *  NOTE: if anything fails during this call we will throw and automatically
    *        revert all changes.
    */
    function voteForCandidate(bytes32 _candidateID) private
    {
        Voter storage voter = voters[msg.sender];    // Get the Voter struct for this sender.

        voter.isVoted = true;
        votedVoterCount += 1;
        voter.votedFor.push(_candidateID); //Add candidateID to list whom voter voted
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
        Voter memory voter = voters[msg.sender];    // Get the Voter struct for this sender.



        for (uint i = 0; i < _candidateIDs.length; i++) {
            voteForCandidate(_candidateIDs[i]);
            //emit VoteFor(msg.sender, _candidateIDs);
        }
    }

    function validCandidate(bytes32 _candidateID) public view returns (bool) {
        for (uint i = 0; i < candidateIDs.length; i++) {
            if (candidateIDs[i] == _candidateID) {
                return true;
            }
        }
        return false;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Getter Functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    /*
    * Returns the ballots bytes32.
    */
    function getBallotInfo() public returns (
        bytes32, uint, uint, uint, uint, bool, uint, uint
    ) {
        return (
        ballotName,
        startRegPhase,
        endRegPhase,
        startVotingPhase,
        endVotingPhase,
        isFinalized,
        registeredVoterCount,
        votedVoterCount
        );
    }

    /*
    * Returns the number of candidates.
    */
    function getCandidateLength() public returns (uint)
    {
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
    function getCandidateVoteCount(bytes32 _candidateID) public returns (uint)
    {
        return voteReceived[_candidateID].length;
    }
    function getCandidateVoterList(bytes32 _candidateID) public returns (address[]) {
        return voteReceived[_candidateID];
    }


    /*
    * Returns if the voting options have been finalized.
    */
    function isBallotFinalized() public returns (bool)
    {
        return isFinalized;
    }

    /*
    * Returns the end time of the ballot in seconds since epoch.
    */
    function getStartRegPhase() public returns (uint)
    {
        return startRegPhase;
    }

    function getEndRegPhase() public returns (uint)
    {
        return endRegPhase;
    }

    function getStartVotingPhase() public returns (uint)
    {
        return startVotingPhase;
    }

    function getEndVotingPhase() public returns (uint)
    {
        return endVotingPhase;
    }

    function close() onlyOwner public {
        selfdestruct(owner);
    }

}

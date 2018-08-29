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

    function close(bytes32 phrase) onlyOwner public {
        require( keccak256(phrase) == keccak256('close'));
        selfdestruct(owner);
    }


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Validator ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    function validTime() private view returns (bool) {
        if ( now > endVotingPhase || now < startVotingPhase)
            return false;
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
    function finalizeBallot(bytes32 phrase) onlyOwner public {
        require(candidateIDs.length > 2);
        require( keccak256(phrase) == keccak256('finalize'));

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
        require(validTime());
        require(canVote(msg.sender));

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

    function hasRightToVote(address voterAddress) public view returns (bool) {
        if (voters[voterAddress].eligibleToVote && voters[voterAddress].isVoted) {
            return true;
        } else {
            return false;
        }
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


}

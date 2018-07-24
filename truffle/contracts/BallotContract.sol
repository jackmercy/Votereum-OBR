pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2; // Allow passing struct as argument

// We have to specify what version of compiler this code will compile with

contract BallotContract {


    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Contract Constructor ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    address owner;                  // The address of the owner. Set in 'Ballot()'
    bool    optionsFinalized;       // Whether the owner can still add voting options.

    /*
    * Modifier to only allow the owner to call a function.
    */
    modifier onlyOwner
    {
        require( msg.sender != owner );
        _;

    }

    /*
    *  This function is called *once* at first initialization into the blockchain.
    */
    constructor ()
    {
        owner                   = msg.sender;       // Set the owner to the address creating the contract.
        optionsFinalized        = false;            // Initially false as we need to add some choices.
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Validator ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    function validTime() private view returns (bool) {
        if ( now > ballotEndTime || now < ballotStartTime)
            return false;
    }

    function canVote(Voter _voter) private view returns (bool) {
        if (optionsFinalized == false)       // If the options are not finalized, we cannot vote.
            return false;

        if (_voter.eligibleToVote == false)
            return false;

        if (_voter.isVoted == true) // If the voter has already voted, voter cannot vote anymore
            return false;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Ballot Options (Candidate) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    bytes32  ballotName;             // The ballot candidateID.
    uint    registeredVoterCount;   // Total number of voter addresses registered.
    uint    ballotEndTime;          // End time for ballot after which no changes can be made. (seconds since 1970-01-01)
    uint    ballotStartTime;        // Start time for ballot before which voters can not vote. (seconds since 1970-01-01)
    uint    votedVoterCount;

    mapping (bytes32 => uint) voteReceived; //Map candidateId to the number of vote they received
    bytes32[] candidateIDs; // dynamically sized array IDs

    function setupBallot (bytes32 _ballotName, uint _ballotEndTime, uint _ballotStartTime) public {
        ballotName = _ballotName;
        ballotEndTime = _ballotEndTime;
        ballotStartTime = _ballotStartTime;
        registeredVoterCount = 0;
        votedVoterCount = 0;
    }

    /*
    *  Add a new candidate for this ballot.
    *  NOTE: this can only be called by the ballot owner.
    */
    function addCandidate(bytes32 _candidateID) onlyOwner private
    {
        require ( now > ballotEndTime);
        require (optionsFinalized == true);    // Check we are allowed to add options.

        candidateIDs.push(_candidateID);
        voteReceived[_candidateID] = 0;
    }

    function addCandidate(bytes32[] _candidateIDs) onlyOwner {
        require ( now > ballotEndTime);
        require (optionsFinalized == true);    // Check we are allowed to add options.

        for (uint i = 0; i < _candidateIDs.length; i++) {
            addCandidate(_candidateIDs[i]);
        }
    }

    /*
    *  Call this once all options have been added, this will stop further changes
    *  and allow votes to be cast.
    *  NOTE: this can only be called by the ballot owner.
    */
    function finalizeBallot() onlyOwner public
    {
        require(now > ballotEndTime);
        require(candidateIDs.length < 2);

        optionsFinalized = true;    // Stop the addition of any more change.
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
    function giveRightToVote(address _voter) onlyOwner
    {
        require(now > ballotEndTime);
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

        require(canVote(voter));

        voter.isVoted = true;
        votedVoterCount += 1;
        voter.votedFor.push(_candidateID);
        voteReceived[_candidateID] += 1;
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

        require(canVote(voter));

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
    function getBallotName() returns (bytes32)
    {
        return ballotName;
    }

    /*
    * Returns the number of candidates.
    */
    function getCandidateLength() returns (uint)
    {
        return candidateIDs.length;
    }

    /*
    * Returns the count of registered voter addresses.
    */
    function getRegisteredVoterCount() returns (uint)
    {
        return registeredVoterCount;
    }

    /*
    * Returns the count of voted voter addresses.
    */
    function getVotedVoterCount() returns (uint)
    {
        return votedVoterCount;
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
    function getCandidateVoteReceived(bytes32 _candidateID) returns (uint)
    {
        return voteReceived[_candidateID];
    }

    /*
    * Returns if the voting options have been finalized.
    */
    function getOptionsFinalized() returns (bool)
    {
        return optionsFinalized;
    }

    /*
    * Returns the end time of the ballot in seconds since epoch.
    */
    function getBallotEndTime() returns (uint)
    {
        return ballotEndTime;
    }

    function getBallotStartTime() returns (uint)
    {
        return ballotStartTime;
    }

}

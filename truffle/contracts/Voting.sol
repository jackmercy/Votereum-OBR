pragma solidity ^0.4.18;
// We have to specify what version of compiler this code will compile with

contract Voting {
    bytes32[] public candidateList;
    /* mapping field below is equivalent to an associative array or hash.
    The key of the mapping is candidate name stored as type bytes32 and value is
    an unsigned integer to store the vote count
    */

    mapping (bytes32 => uint256) public votesReceived;
    /* Solidity doesn't let you pass in an array of strings in the constructor (yet).
    We will use an array of bytes32 instead to store the list of candidates
    */

    event VoteFor(address indexed from, bytes32[] indexed toCandidates);
    /* This is the constructor which will be called once when you
    deploy the contract to the blockchain. When we deploy the contract,
    we will pass an array of candidates who will be contesting in the election
    */

    constructor (bytes32[] candidateIDs) public {
        candidateList = candidateIDs;
        for (uint i = 0; i < candidateList.length; i++) {
            votesReceived[candidateList[i]] = 7*i + 3;
        }
    }

    /* add list of candidates ? */
    function updateCandidateList(bytes32[] candidateIDs) public {
        candidateList = candidateIDs;
        for (uint i = 0; i < candidateList.length; i++) {
            if (votesReceived[candidateList[i]] != 0) {
                votesReceived[candidateList[i]] = 0;
            }
        }
    }

    // This function returns the total votes A candidate has received so far
    function totalVotesFor(bytes32 candidate)  public view returns (uint256) {
        require(validCandidate(candidate));
        return votesReceived[candidate];
    }

    // This function increments the vote count for the specified candidate.
    function voteForCandidate(bytes32 candidate) private {
        require(validCandidate(candidate));
        votesReceived[candidate] += 1;
    }

    /** This function increments the vote for all the cadidate that sender vote for. */
    function voteForCandidates(bytes32[] cadidates) public {
        for (uint i = 0; i < cadidates.length; i++) {
            voteForCandidate(cadidates[i]);
            emit VoteFor(msg.sender, cadidates);
        }
    }

    function validCandidate(bytes32 candidate)  public view returns (bool) {
        for (uint i = 0; i < candidateList.length; i++) {
            if (candidateList[i] == candidate) {
                return true;
            }
        }
        return false;
    }

}
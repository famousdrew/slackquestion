/**
 * Test script for question detection patterns
 * Usage: node test-question-detection.js
 *
 * Add your own test cases to verify detection logic works correctly
 */
import { isQuestion } from './dist/services/questionDetector.js';

// Test cases - add your own examples that aren't being detected
const testMessages = [
  // Should detect
  "How do I reset my password?",
  "What is the process for X?",
  "Can someone help with this?",
  "Does anyone know about Y?",

  // Common patterns that might NOT be detected
  "I need to know how to do X",
  "Looking for help with Y",
  "Wondering if anyone has tried Z",
  "Any thoughts on this approach?",
  "Is it possible to configure X?",
  "Do we have documentation for Y?",
  "Have you seen this error before?",
  "Did anyone figure out Z?",
  "Will this work if I do X?",
  "Should I use approach A or B?",
  "Could you show me how to X?",
  "Anyone have experience with Y?",
  "I'm trying to understand Z",
  "Not sure how to proceed with X",

  // Add your specific examples here
  "<!subteam^S05V61ZH519> // Lion Business Services LLC-10154414\nCan we configure this?",

  // Real example from work_questions that wasn't detected
  "@citadel I have a clock here that when booting asks to launch with Empire? Is that the citadel app name?\nAfterward the date and time are wrong, set for 2009, and when trying to join a network the clock shows networks but won't stop scanning to allow him to select one.",

  // Another real example
  "@uattend Would Job Tracking be a great feature for them? I've sent over articles and additional information but she wants to make sure what she is doing on paper can be done via the job tracking feature.\n\"We have the guys manually clock in and out on a time card. Then in a notebook they keep a list of their hours for the day- and who's car they worked on - we have everyone's car coded with Initials. So one car is SA72, another is ST72.\nThen my husband at the end of each day takes their notebooks and re-enters the information in client note books- just simplifying it. So that when we do billing at the end of the month we have an easier way to add up the hours- and have a description.\"",
];

console.log('Testing Question Detection\n' + '='.repeat(50));

testMessages.forEach((msg, i) => {
  const detected = isQuestion(msg);
  const preview = msg.substring(0, 60).replace(/\n/g, ' ');
  const status = detected ? '✅ DETECTED' : '❌ MISSED';
  console.log(`\n${i + 1}. ${status}`);
  console.log(`   "${preview}${msg.length > 60 ? '...' : ''}"`);
});

console.log('\n' + '='.repeat(50));
console.log('Add messages from work_questions that are being missed!');

import type {
  PlacementQuestion,
  PlacementQuestionForClient,
} from "../../domain/entities/Placement.js";

const placementQuestions: readonly PlacementQuestion[] = [
  {
    id: "q1",
    prompt: "I ___ a software developer, in the control workin positions",
    options: [
      { id: "a", text: "is" },
      { id: "b", text: "am" },
      { id: "c", text: "are" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q2",
    prompt: "The server is currently ___.",
    options: [
      { id: "a", text: "commit" },
      { id: "b", text: "write" },
      { id: "c", text: "down" },
    ],
    correctOptionId: "c",
  },
  {
    id: "q3",
    prompt: "Please ___ the application after changing the configuration.",
    options: [
      { id: "a", text: "restarted" },
      { id: "b", text: "restart" },
      { id: "c", text: "restarting" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q4",
    prompt: "A bug is an ___ in software.",
    options: [
      { id: "a", text: "environment" },
      { id: "b", text: "engineer" },
      { id: "c", text: "error" },
    ],
    correctOptionId: "c",
  },
  {
    id: "q5",
    prompt: "We need to ___ the changes before the release.",
    options: [
      { id: "a", text: "tested" },
      { id: "b", text: "test" },
      { id: "c", text: "testing" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q6",
    prompt: "The database ___ every night.",
    options: [
      { id: "a", text: "is backed up" },
      { id: "b", text: "back up" },
      { id: "c", text: "backed" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q7",
    prompt: "If the build ___, we will deploy the application.",
    options: [
      { id: "a", text: "passes" },
      { id: "b", text: "pass" },
      { id: "c", text: "passing" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q8",
    prompt: "This issue has been ___ to the backend team.",
    options: [
      { id: "a", text: "assign" },
      { id: "b", text: "assigned" },
      { id: "c", text: "assigning" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q9",
    prompt: "Could you ___ why this endpoint returns a 500 error?",
    options: [
      { id: "a", text: "explaining" },
      { id: "b", text: "explained" },
      { id: "c", text: "explain" },
    ],
    correctOptionId: "c",
  },
  {
    id: "q10",
    prompt: "The deployment was delayed ___ a configuration error.",
    options: [
      { id: "a", text: "because of" },
      { id: "b", text: "although" },
      { id: "c", text: "unless" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q11",
    prompt: "The feature would have been released if all tests ___.",
    options: [
      { id: "a", text: "had passed" },
      { id: "b", text: "have pass" },
      { id: "c", text: "were pass" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q12",
    prompt:
      "The incident report should outline the root cause and ___ actions.",
    options: [
      { id: "a", text: "correctly" },
      { id: "b", text: "correct" },
      { id: "c", text: "corrective" },
    ],
    correctOptionId: "c",
  },
];

export function getPlacementQuestions(): PlacementQuestionForClient[] {
  return placementQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
  }));
}

export function getPlacementQuestionsForEvaluation(): readonly PlacementQuestion[] {
  return placementQuestions;
}

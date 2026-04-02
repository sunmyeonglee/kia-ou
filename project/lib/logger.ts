import supabase from "./supabase";

export interface Phase1LogEntry {
  teamId: string;
  turnIndex: number;
  userMessage: string;
  rationale: string;
  concept1: string;
  concept2: string;
  likert: number | null;
}

export interface Phase2LogEntry {
  teamId: string;
  selectedConcept1: string;
  selectedConcept2: string;
  userMessage: string;
  fusionDescription: string;
  imageUrl: string;
}

export async function logPhase1(entry: Phase1LogEntry) {
  await supabase.from("phase1_logs").insert({
    team_id: entry.teamId,
    turn_index: entry.turnIndex,
    user_message: entry.userMessage,
    rationale: entry.rationale,
    concept1: entry.concept1,
    concept2: entry.concept2,
    likert: entry.likert,
  });
}

export async function logPhase2(entry: Phase2LogEntry) {
  await supabase.from("phase2_logs").insert({
    team_id: entry.teamId,
    selected_concept1: entry.selectedConcept1,
    selected_concept2: entry.selectedConcept2,
    user_message: entry.userMessage,
    fusion_description: entry.fusionDescription,
    image_url: entry.imageUrl,
  });
}

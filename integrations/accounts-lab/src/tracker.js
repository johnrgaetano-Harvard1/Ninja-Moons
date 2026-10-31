// Future-only story integration. Preserves the approved NINJA Reader until privacy review.
export const EVENT_TYPES=Object.freeze(["story_open","story_close","sentence_read","word_tap","helper_step","question_view"]);
export function validateEvent(e){
 if(!e||typeof e!=="object")throw new TypeError("Event required");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.storySlug||""))throw new TypeError("Invalid story");
 if(!EVENT_TYPES.includes(e.type))throw new TypeError("Invalid type");
 if(e.sentenceNumber!=null&&(!Number.isInteger(e.sentenceNumber)||e.sentenceNumber<1||e.sentenceNumber>50000))throw new TypeError("Invalid sentence");
 if(e.helperStage!=null&&(!Number.isInteger(e.helperStage)||e.helperStage<1||e.helperStage>4))throw new TypeError("Invalid helper stage");
 if(e.durationMs!=null&&(!Number.isInteger(e.durationMs)||e.durationMs<0||e.durationMs>3600000))throw new TypeError("Invalid duration");
 return true;
}
export async function recordEvent({client,userId,studentId,event}){
 validateEvent(event);
 if(!client||!userId||!studentId)throw new Error("Approved learner session required");
 const {error}=await client.from("reading_events").insert({
  client_event_id:crypto.randomUUID(),student_id:studentId,actor_user_id:userId,
  story_slug:event.storySlug,event_type:event.type,
  sentence_number:event.sentenceNumber??null,helper_stage:event.helperStage??null,duration_ms:event.durationMs??null
 });
 if(error)throw new Error("Progress not saved; retry once connected");
 return {saved:true,verifiedMastery:false};
}
export async function recordQuizChoice({client,userId,studentId,storySlug,questionId,answerChoice}){
 if(!client||!userId||!studentId)throw new Error("Approved learner session required");
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storySlug||"")
 ||typeof questionId!=="string"||!questionId||questionId.length>80
 ||typeof answerChoice!=="string"||!answerChoice||answerChoice.length>30)throw new TypeError("Invalid quiz answer");
 const {error}=await client.from("quiz_attempts").insert({
  client_event_id:crypto.randomUUID(),student_id:studentId,actor_user_id:userId,
  story_slug:storySlug,question_id:questionId,answer_choice:answerChoice
 });
 if(error)throw new Error("Quiz choice not saved");
 return {saved:true,graded:false};
}

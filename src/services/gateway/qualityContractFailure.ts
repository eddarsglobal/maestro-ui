/**
 * G3C UI-only adapter for the EXACT public G3B quality failure messages.
 * The Gateway currently exposes a localized human-readable error, not a typed
 * quality failure code on this browser transport. Fail closed: any new or
 * unknown text remains a gateway error until a structured protocol exists.
 * No raw prompt/output or model telemetry is examined; no provider decisions.
 */
const G3B_QUALITY_FAILURE_MESSAGES: ReadonlySet<string> = new Set<string>([
  "I couldn't produce a response in exactly two paragraphs after the permitted retry. No nonconforming answer was delivered.",
  "I couldn't produce a digits-only response after the permitted retry. No nonconforming answer was delivered.",
  "I couldn't produce a response that passed the quality requirements within the permitted attempts. No rejected answer was delivered.",
  "Je n'ai pas pu produire une réponse en exactement deux paragraphes après la reprise autorisée. Aucune réponse non conforme n'a été livrée.",
  "Je n'ai pas pu produire une réponse composée uniquement de chiffres après la reprise autorisée. Aucune réponse non conforme n'a été livrée.",
  "Je n'ai pas pu produire une réponse conforme dans la limite des tentatives autorisées. Aucune réponse rejetée n'a été livrée.",
  "Auch nach dem erlaubten erneuten Versuch konnte ich keine Antwort mit genau zwei Absätzen erstellen. Die abgelehnte Antwort wurde nicht ausgegeben.",
  "Auch nach dem erlaubten erneuten Versuch konnte ich keine Antwort nur mit Ziffern erstellen. Die abgelehnte Antwort wurde nicht ausgegeben.",
  "Innerhalb der erlaubten Versuche konnte ich keine passende Antwort erstellen. Die abgelehnte Antwort wurde nicht ausgegeben.",
  "لم أتمكن من تقديم إجابة من فقرتين بالضبط بعد إعادة المحاولة المسموح بها. لم يتم عرض الإجابة غير المطابقة.",
  "لم أتمكن من تقديم إجابة تتكون من أرقام فقط بعد إعادة المحاولة المسموح بها. لم يتم عرض الإجابة غير المطابقة.",
  "لم أتمكن من تقديم إجابة مطابقة ضمن عدد المحاولات المسموح به. لم يتم عرض الإجابة المرفوضة.",
  "Não consegui produzir uma resposta com exatamente dois parágrafos após a nova tentativa permitida. A resposta não conforme não foi apresentada.",
  "Não consegui produzir uma resposta apenas com algarismos após a nova tentativa permitida. A resposta não conforme não foi apresentada.",
  "Não consegui produzir uma resposta conforme dentro das tentativas permitidas. A resposta rejeitada não foi apresentada.",
  "No pude generar una respuesta de exactamente dos párrafos tras el reintento permitido. No se mostró ninguna respuesta que incumpliera el formato.",
  "No pude generar una respuesta solo con dígitos tras el reintento permitido. No se mostró ninguna respuesta que incumpliera el formato.",
  "No pude generar una respuesta válida dentro de los intentos permitidos. No se mostró la respuesta rechazada.",
  "Nisam uspio sastaviti odgovor u točno dva odlomka ni nakon dopuštenog ponovnog pokušaja. Neodgovarajući odgovor nije prikazan.",
  "Nisam uspio sastaviti odgovor samo od znamenki ni nakon dopuštenog ponovnog pokušaja. Neodgovarajući odgovor nije prikazan.",
  "Nisam uspio sastaviti odgovarajući odgovor unutar dopuštenog broja pokušaja. Odbijeni odgovor nije prikazan.",
  "Non sono riuscito a produrre una risposta in esattamente due paragrafi dopo il nuovo tentativo consentito. La risposta non conforme non è stata mostrata.",
  "Non sono riuscito a produrre una risposta composta solo da cifre dopo il nuovo tentativo consentito. La risposta non conforme non è stata mostrata.",
  "Non sono riuscito a produrre una risposta conforme entro i tentativi consentiti. La risposta rifiutata non è stata mostrata.",
 ]);

export function isQualityContractFailureMessage(message: string): boolean {
  return G3B_QUALITY_FAILURE_MESSAGES.has(message.trim());
}

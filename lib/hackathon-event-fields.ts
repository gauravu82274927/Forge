export const eventFields = [
  ['event_details', 'Event details', 3000],
  ['event_period', 'Event dates and times', 150],
  ['event_organizer', 'Organizer', 200],
  ['event_location', 'Location or format', 200],
  ['event_team_size', 'Team size', 100],
  ['event_registration_closes', 'Registration closes', 150],
  ['event_submission_deadline', 'Submission deadline', 150],
] as const;

export type EventField = (typeof eventFields)[number][0];

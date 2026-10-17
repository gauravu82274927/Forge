export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'any';
export type PostStatus = 'open' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export const CATEGORIES = [
  'AI / ML',
  'Web App',
  'Mobile App',
  'Open Source',
  'Sustainability',
  'Developer Tools',
  'Game Dev',
  'Other',
] as const;

export const COMMITMENTS = [
  '2-4 hrs/week',
  '5-8 hrs/week',
  '8-12 hrs/week',
  '10-15 hrs/week',
  '15+ hrs/week',
] as const;

export const COLLAB_FORMATS = [
  { value: 'remote-flexible', label: 'Remote, flexible hours' },
  { value: 'remote-async', label: 'Remote, async-first' },
  { value: 'hybrid', label: 'Hybrid (some in-person)' },
  { value: 'in-person', label: 'In person' },
] as const;

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'any', label: 'Any level' },
];

export const COMMITMENT_OPTIONS = [
  { value: 'flexible', label: 'Flexible' },
  { value: '2-4 hrs/week', label: '2-4 hrs/week' },
  { value: '5-8 hrs/week', label: '5-8 hrs/week' },
  { value: '8-12 hrs/week', label: '8-12 hrs/week' },
  { value: '15+ hrs/week', label: '15+ hrs/week' },
] as const;

export const AVAILABILITY_OPTIONS = COMMITMENT_OPTIONS;

export const SKILL_OPTIONS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Swift',
  'SwiftUI', 'iOS', 'React Native', 'Node.js', 'FastAPI', 'PostgreSQL',
  'PyTorch', 'LLM APIs', 'Figma', 'User research', 'Design systems',
  'AST parsing', 'CLI design', 'HTTP', 'Data analysis', 'Technical writing',
  'UI design', 'Product', 'Flutter', 'Go', 'Java', 'Kotlin', 'Unity',
] as const;

export const ROLE_OPTIONS = [
  'Frontend Developer', 'Backend Developer', 'Fullstack Developer',
  'ML Engineer', 'iOS Developer', 'Mobile Developer', 'Designer',
  'Product', 'Data Researcher', 'Technical Writer', 'Documentation',
  'Design QA', 'DevOps', 'Other',
] as const;

export interface Profile {
  id: string;
  display_name: string;
  college: string | null;
  course: string | null;
  graduation_year: number | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  preferred_roles: string[];
  availability: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamPost {
  id: string;
  owner_id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  required_skills: string[];
  open_roles: string[];
  open_positions: number;
  commitment: string;
  experience_level: ExperienceLevel;
  deadline: string | null;
  collaboration_format: string;
  application_instructions: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  owner?: Pick<Profile, 'id' | 'display_name' | 'college' | 'course' | 'github_url' | 'avatar_url'>;
  accepted_count?: number;
  is_demo?: boolean;
}

export interface Application {
  id: string;
  team_post_id: string;
  applicant_id: string;
  intro_message: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  team_post?: TeamPost;
  applicant?: Pick<Profile, 'id' | 'display_name' | 'college' | 'course' | 'skills' | 'github_url' | 'avatar_url'>;
}

export interface Report {
  id: string;
  reporter_id: string;
  team_post_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  requester?: Pick<Profile, 'id' | 'display_name' | 'college' | 'course' | 'avatar_url'>;
  addressee?: Pick<Profile, 'id' | 'display_name' | 'college' | 'course' | 'avatar_url'>;
}

export type PersonResult = Pick<
  Profile,
  'id' | 'display_name' | 'college' | 'course' | 'skills' | 'experience_level' | 'avatar_url'
>;

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender?: Pick<Profile, 'id' | 'display_name'>;
}

/** Application events for the notification panel. */
export interface ApplicationEvent {
  id: string;
  kind: 'applied' | 'accepted' | 'rejected';
  created_at: string;
  postId: string;
  postTitle: string;
  /** Who applied (for 'applied'); undefined for decisions on your own applications. */
  person?: string;
}

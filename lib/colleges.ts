// Suggestions for the college field. Users can still type any name that is
// not listed, so this does not need to be exhaustive.
export const COLLEGES: string[] = [
  // IITs
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'IIT Kharagpur', 'IIT Roorkee',
  'IIT Guwahati', 'IIT Hyderabad', 'IIT (BHU) Varanasi', 'IIT Indore', 'IIT Ropar',
  'IIT Bhubaneswar', 'IIT Gandhinagar', 'IIT Patna', 'IIT Mandi', 'IIT Jodhpur',
  'IIT (ISM) Dhanbad', 'IIT Tirupati', 'IIT Palakkad', 'IIT Bhilai', 'IIT Goa',
  'IIT Jammu', 'IIT Dharwad',
  // NITs
  'NIT Trichy', 'NIT Surathkal', 'NIT Warangal', 'NIT Rourkela', 'NIT Calicut',
  'NIT Allahabad (MNNIT)', 'NIT Jaipur (MNIT)', 'NIT Nagpur (VNIT)', 'NIT Durgapur',
  'NIT Kurukshetra', 'NIT Silchar', 'NIT Hamirpur', 'NIT Jalandhar', 'NIT Jamshedpur',
  'NIT Patna', 'NIT Raipur', 'NIT Srinagar', 'NIT Agartala', 'NIT Bhopal (MANIT)',
  'NIT Delhi', 'NIT Goa', 'NIT Meghalaya', 'NIT Puducherry', 'NIT Uttarakhand',
  // IIITs and other central institutes
  'IIIT Hyderabad', 'IIIT Bangalore', 'IIIT Delhi', 'IIIT Allahabad', 'IIIT Gwalior',
  'IIIT Jabalpur', 'IIIT Kancheepuram', 'IIIT Guwahati', 'IIIT Lucknow', 'IIIT Pune',
  'IIIT Vadodara', 'IIIT Kota', 'IIIT Sonepat', 'IIIT Nagpur', 'IIIT Ranchi',
  'IISc Bangalore', 'IISER Pune', 'IISER Kolkata', 'IISER Mohali', 'IISER Bhopal',
  'BITS Pilani', 'BITS Pilani, Goa Campus', 'BITS Pilani, Hyderabad Campus',
  'Delhi Technological University (DTU)', 'Netaji Subhas University of Technology (NSUT)',
  'Indira Gandhi Delhi Technical University for Women (IGDTUW)',
  'Jamia Millia Islamia', 'Aligarh Muslim University', 'Banaras Hindu University',
  'University of Delhi', 'Jawaharlal Nehru University', 'University of Hyderabad',
  'University of Mumbai', 'University of Calcutta', 'Jadavpur University',
  'University of Pune (Savitribai Phule Pune University)', 'Anna University',
  'University of Madras', 'University of Kerala', 'Osmania University',
  'Panjab University', 'Punjabi University', 'Guru Nanak Dev University',
  'Chitkara University', 'Chandigarh University', 'Lovely Professional University',
  'Thapar Institute of Engineering and Technology', 'Punjab Engineering College (PEC)',
  'Punjab Agricultural University', 'Guru Nanak Dev Engineering College, Ludhiana',
  'Chandigarh College of Engineering and Technology', 'UIET, Panjab University',
  'Amity University', 'Manipal Institute of Technology', 'VIT Vellore', 'VIT Chennai',
  'VIT Bhopal', 'VIT-AP', 'SRM Institute of Science and Technology', 'SASTRA University',
  'Amrita Vishwa Vidyapeetham', 'PSG College of Technology', 'Coimbatore Institute of Technology',
  'College of Engineering, Guindy', 'Madras Institute of Technology',
  'Kalasalingam Academy of Research and Education', 'Saveetha Institute of Medical and Technical Sciences',
  'Birla Institute of Technology, Mesra', 'KIIT University', 'Siksha O Anusandhan (SOA)',
  'Symbiosis International University', 'MIT World Peace University', 'COEP Technological University',
  'Vishwakarma Institute of Technology', 'Pune Institute of Computer Technology (PICT)',
  'Veermata Jijabai Technological Institute (VJTI)', 'Sardar Patel Institute of Technology',
  'Dwarkadas J. Sanghvi College of Engineering', 'K. J. Somaiya College of Engineering',
  'Thadomal Shahani Engineering College', 'Institute of Chemical Technology (ICT) Mumbai',
  'NMIMS Mumbai', 'Shiv Nadar University', 'Ashoka University', 'Plaksha University',
  'O.P. Jindal Global University', 'Bennett University', 'Sharda University',
  'Galgotias University', 'GL Bajaj Institute of Technology and Management',
  'KIET Group of Institutions', 'Ajay Kumar Garg Engineering College',
  'Jaypee Institute of Information Technology', 'Jaypee University of Information Technology',
  'Maharaja Agrasen Institute of Technology', 'Bharati Vidyapeeth College of Engineering',
  'Maharaja Surajmal Institute of Technology', 'Guru Gobind Singh Indraprastha University',
  'Delhi Skill and Entrepreneurship University', 'Vellore Institute of Technology',
  'RV College of Engineering', 'BMS College of Engineering', 'PES University',
  'MS Ramaiah Institute of Technology', 'Dayananda Sagar College of Engineering',
  'BMS Institute of Technology and Management', 'Christ University', 'Reva University',
  'Presidency University Bangalore', 'JSS Science and Technology University',
  'National Institute of Engineering, Mysuru', 'Visvesvaraya Technological University (VTU)',
  'JNTU Hyderabad', 'JNTU Kakinada', 'JNTU Anantapur', 'CBIT Hyderabad', 'VNR VJIET',
  'Vasavi College of Engineering', 'GITAM University', 'Andhra University',
  'Koneru Lakshmaiah Education Foundation (KL University)', 'Vignan University',
  'Cochin University of Science and Technology', 'College of Engineering Trivandrum',
  'Government Engineering College, Thrissur', 'TKM College of Engineering',
  'Rajiv Gandhi Technical University', 'Maulana Azad National Institute of Technology',
  'Malaviya National Institute of Technology', 'Shri G.S. Institute of Technology and Science',
  'Medi-Caps University', 'Institute of Engineering and Technology, Lucknow',
  'Harcourt Butler Technical University', 'Madan Mohan Malaviya University of Technology',
  'Dr. A.P.J. Abdul Kalam Technical University', 'Motilal Nehru National Institute of Technology',
  'Indian Institute of Information Technology, Design and Manufacturing',
  'Visva-Bharati', 'Presidency University Kolkata', 'Heritage Institute of Technology',
  'Institute of Engineering and Management (IEM) Kolkata', 'Techno India University',
  'Calcutta Institute of Technology', 'Birla Institute of Technology and Science',
  'Gujarat Technological University', 'Nirma University', 'DA-IICT Gandhinagar',
  'Pandit Deendayal Energy University', 'Charusat University', 'Parul University',
  'LD College of Engineering', 'Marwadi University', 'Indus University',
  'Manipal University Jaipur', 'LNM Institute of Information Technology',
  'Malaviya National Institute of Technology Jaipur', 'Poornima University',
  'Arya College of Engineering', 'JECRC University', 'Rajasthan Technical University',
  'Indian Institute of Management (IIM) Ahmedabad', 'IIM Bangalore', 'IIM Calcutta',
  'ISI Kolkata', 'ISB Hyderabad', 'XLRI Jamshedpur', 'FMS Delhi', 'SRCC Delhi',
  'St. Stephen\'s College, Delhi', 'Hindu College, Delhi', 'Miranda House, Delhi',
  'Lady Shri Ram College for Women', 'Hansraj College', 'Kirori Mal College',
  'Ramjas College', 'Delhi College of Engineering', 'Loyola College, Chennai',
  'Madras Christian College', 'St. Xavier\'s College, Mumbai', 'St. Xavier\'s College, Kolkata',
  'Fergusson College, Pune', 'Mount Carmel College, Bangalore',
  // Global
  'MIT', 'Stanford University', 'Harvard University', 'UC Berkeley', 'Carnegie Mellon University',
  'Georgia Tech', 'University of Illinois Urbana-Champaign', 'University of Toronto',
  'University of Waterloo', 'University of Oxford', 'University of Cambridge',
  'Imperial College London', 'ETH Zurich', 'National University of Singapore',
  'Nanyang Technological University', 'Tsinghua University', 'University of Tokyo',
];

export function searchOptions(source: string[], query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of Array.from(new Set(source))) {
    const n = name.toLowerCase();
    if (n.startsWith(q)) starts.push(name);
    else if (n.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, limit);
}

// Suggestions for the course / field of study. Any typed value is still allowed.
export const COURSES: string[] = [
  // Engineering and computing
  'Computer Science', 'Computer Science and Engineering', 'Information Technology',
  'Software Engineering', 'Artificial Intelligence', 'Artificial Intelligence and Machine Learning',
  'Artificial Intelligence and Data Science', 'Data Science', 'Machine Learning', 'Cyber Security',
  'Cloud Computing', 'Internet of Things', 'Blockchain Technology', 'Computer Applications (BCA)',
  'Computer Applications (MCA)', 'Electronics and Communication Engineering',
  'Electrical Engineering', 'Electrical and Electronics Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Automobile Engineering',
  'Biotechnology', 'Biomedical Engineering', 'Environmental Engineering', 'Industrial Engineering',
  'Instrumentation Engineering', 'Mechatronics', 'Robotics and Automation', 'Production Engineering',
  'Metallurgical Engineering', 'Mining Engineering', 'Marine Engineering', 'Textile Engineering',
  'Agricultural Engineering', 'Petroleum Engineering', 'Materials Science', 'Engineering Physics',
  'Mathematics and Computing', 'VLSI Design', 'Embedded Systems', 'Game Development',
  // Sciences
  'Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Biology', 'Microbiology', 'Biochemistry',
  'Zoology', 'Botany', 'Geology', 'Environmental Science', 'Neuroscience', 'Cognitive Science',
  'Food Technology', 'Forensic Science', 'Pharmacy', 'Nursing', 'Medicine (MBBS)', 'Dentistry (BDS)',
  'Physiotherapy', 'Veterinary Science', 'Agriculture',
  // Design, arts, business, humanities
  'Design', 'UI/UX Design', 'Graphic Design', 'Product Design', 'Fashion Design',
  'Architecture', 'Interior Design', 'Animation and Multimedia', 'Film and Media Studies',
  'Journalism and Mass Communication', 'Business Administration (BBA)',
  'Business Administration (MBA)', 'Commerce', 'Economics', 'Finance', 'Marketing',
  'Accounting', 'Entrepreneurship', 'Management', 'Law (LLB)', 'Public Policy',
  'Psychology', 'Sociology', 'Political Science', 'History', 'English Literature',
  'Philosophy', 'Linguistics', 'Education', 'Music', 'Fine Arts', 'Hotel Management',
  'Liberal Arts', 'Other',
];

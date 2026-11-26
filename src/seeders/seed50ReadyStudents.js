/**
 * NSTPConnect - Seeder for 50 Fully Compliant Students Ready for Deployment
 * Creates 50 student accounts with:
 *  1. User credentials (role='student', profile_status='complete', cmo_compliance_status='compliant')
 *  2. Complete Student Profiles (LSPU courses, contact info, Laguna coordinates, CWTS skills, emergency contacts)
 *  3. 4 Approved CMO Requirements (medical_certificate, notarized_parent_waiver, validated_student_id, valid_parent_id)
 */

const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');

const DEFAULT_PASSWORD = 'Test123!';
const REVIEWER_ID = '76dbbecd-4deb-4b6d-9c23-1f1e58df5916'; // NSTP Coordinator ID (nstpconnect@gmail.com)

const CMO_TYPES = [
  'medical_certificate',
  'notarized_parent_waiver',
  'validated_student_id',
  'valid_parent_id'
];

const STUDENTS = [
  // Siniloan (Campus Area & nearby barangays)
  {
    email: 'markangelo.santos@lspu.edu.ph',
    fullName: 'Mark Angelo D. Santos',
    studentNumber: '0226-2001',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09172001001',
    birthdate: '2007-02-14',
    sex: 'Male',
    municipality: 'Siniloan',
    barangay: 'General Luna',
    completeAddress: '124 M.H. Del Pilar St., Brgy. General Luna, Siniloan, Laguna',
    location: '14.421500,121.448200',
    skills: 'Computer Literacy, Documentation, Web Research',
    emergencyContactName: 'Elena Santos',
    emergencyContactNumber: '09172001999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'kristine.reyes@lspu.edu.ph',
    fullName: 'Kristine Joy B. Reyes',
    studentNumber: '0226-2002',
    course: 'BSCS',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09182002002',
    birthdate: '2007-05-20',
    sex: 'Female',
    municipality: 'Siniloan',
    barangay: 'Salubungan',
    completeAddress: '45 J.P. Rizal Ave., Brgy. Salubungan, Siniloan, Laguna',
    location: '14.423100,121.446800',
    skills: 'Computer Literacy, Data Entry, First Aid',
    emergencyContactName: 'Ramon Reyes',
    emergencyContactNumber: '09182002999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'joshua.mendoza@lspu.edu.ph',
    fullName: 'Joshua M. Mendoza',
    studentNumber: '0226-2003',
    course: 'BSCpE',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09192003003',
    birthdate: '2006-11-08',
    sex: 'Male',
    municipality: 'Siniloan',
    barangay: 'Wawa',
    completeAddress: '18 Laguna Blvd., Brgy. Wawa, Siniloan, Laguna',
    location: '14.417800,121.443500',
    skills: 'Technical Support, Computer Literacy, Disaster Preparedness',
    emergencyContactName: 'Teresa Mendoza',
    emergencyContactNumber: '09192003999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'patricia.garcia@lspu.edu.ph',
    fullName: 'Patricia Anne C. Garcia',
    studentNumber: '0226-2004',
    course: 'BSED',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09202004004',
    birthdate: '2007-08-12',
    sex: 'Female',
    municipality: 'Siniloan',
    barangay: 'Macatad',
    completeAddress: '88 Mabini St., Brgy. Macatad, Siniloan, Laguna',
    location: '14.426200,121.450100',
    skills: 'Teaching & Tutoring, Child Care, Public Speaking',
    emergencyContactName: 'Arnel Garcia',
    emergencyContactNumber: '09202004999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'christian.castillo@lspu.edu.ph',
    fullName: 'Christian Paul L. Castillo',
    studentNumber: '0226-2005',
    course: 'BSBA',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09212005005',
    birthdate: '2006-09-25',
    sex: 'Male',
    municipality: 'Siniloan',
    barangay: 'Acevida',
    completeAddress: '67 Bonifacio St., Brgy. Acevida, Siniloan, Laguna',
    location: '14.419400,121.449500',
    skills: 'Community Organizing, Event Management, Documentation',
    emergencyContactName: 'Lourdes Castillo',
    emergencyContactNumber: '09212005999',
    emergencyContactRelationship: 'Mother'
  },

  // Famy (Adjoining municipality)
  {
    email: 'althea.ramos@lspu.edu.ph',
    fullName: 'Althea Mae F. Ramos',
    studentNumber: '0226-2006',
    course: 'BSHM',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09222006006',
    birthdate: '2007-04-03',
    sex: 'Female',
    municipality: 'Famy',
    barangay: 'Batuhan',
    completeAddress: '22 Famy National Rd., Brgy. Batuhan, Famy, Laguna',
    location: '14.438100,121.452300',
    skills: 'Food Preparation, Hospitality Support, Health Education',
    emergencyContactName: 'Danilo Ramos',
    emergencyContactNumber: '09222006999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'miguel.flores@lspu.edu.ph',
    fullName: 'Miguel Luis S. Flores',
    studentNumber: '0226-2007',
    course: 'BSA (Agri)',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09232007007',
    birthdate: '2006-12-19',
    sex: 'Male',
    municipality: 'Famy',
    barangay: 'Calumpang',
    completeAddress: '15 Agro-Valley Lane, Brgy. Calumpang, Famy, Laguna',
    location: '14.442500,121.456800',
    skills: 'Agriculture & Gardening, Tree Planting, Environmental Awareness',
    emergencyContactName: 'Clara Flores',
    emergencyContactNumber: '09232007999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'chelsy.navarro@lspu.edu.ph',
    fullName: 'Chelsy Nicole T. Navarro',
    studentNumber: '0226-2008',
    course: 'BSPsyc',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09242008008',
    birthdate: '2007-07-28',
    sex: 'Female',
    municipality: 'Famy',
    barangay: 'Asis',
    completeAddress: '78 Villa Asis, Brgy. Asis, Famy, Laguna',
    location: '14.434600,121.448900',
    skills: 'Counseling Support, Peer Mentoring, First Aid',
    emergencyContactName: 'Reynaldo Navarro',
    emergencyContactNumber: '09242008999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'vincent.valdez@lspu.edu.ph',
    fullName: 'Vincent John P. Valdez',
    studentNumber: '0226-2009',
    course: 'BSCrim',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09252009009',
    birthdate: '2006-03-31',
    sex: 'Male',
    municipality: 'Famy',
    barangay: 'Damayan',
    completeAddress: '102 Peace Rd., Brgy. Damayan, Famy, Laguna',
    location: '14.440200,121.454200',
    skills: 'Disaster Preparedness, Traffic & Crowd Control, Physical Fitness',
    emergencyContactName: 'Marites Valdez',
    emergencyContactNumber: '09252009999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'kyla.solis@lspu.edu.ph',
    fullName: 'Kyla Denise R. Solis',
    studentNumber: '0226-2010',
    course: 'BSTM',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09262010010',
    birthdate: '2007-10-15',
    sex: 'Female',
    municipality: 'Famy',
    barangay: 'Tunhac',
    completeAddress: '55 San Jose Way, Brgy. Tunhac, Famy, Laguna',
    location: '14.445100,121.458900',
    skills: 'Tour Guiding, Public Relations, Cultural Promotion',
    emergencyContactName: 'Edwin Solis',
    emergencyContactNumber: '09262010999',
    emergencyContactRelationship: 'Father'
  },

  // Mabitac
  {
    email: 'gabriel.torres@lspu.edu.ph',
    fullName: 'Gabriel Isaac E. Torres',
    studentNumber: '0226-2011',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09272011011',
    birthdate: '2006-08-05',
    sex: 'Male',
    municipality: 'Mabitac',
    barangay: 'Amuyong',
    completeAddress: '31 Battle of Mabitac Shrine Rd., Brgy. Amuyong, Mabitac, Laguna',
    location: '14.428500,121.428100',
    skills: 'Computer Literacy, Hardware Maintenance, Documentation',
    emergencyContactName: 'Victoria Torres',
    emergencyContactNumber: '09272011999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'jasmine.aguilar@lspu.edu.ph',
    fullName: 'Jasmine Rose K. Aguilar',
    studentNumber: '0226-2012',
    course: 'BEED',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09282012012',
    birthdate: '2007-01-22',
    sex: 'Female',
    municipality: 'Mabitac',
    barangay: 'Lucong',
    completeAddress: '14 Riverview St., Brgy. Lucong, Mabitac, Laguna',
    location: '14.431200,121.431500',
    skills: 'Elementary Teaching, Storytelling, Arts & Crafts',
    emergencyContactName: 'Felipe Aguilar',
    emergencyContactNumber: '09282012999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'nathaniel.delacruz@lspu.edu.ph',
    fullName: 'Nathaniel O. Dela Cruz',
    studentNumber: '0226-2013',
    course: 'BSABE',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09292013013',
    birthdate: '2006-06-17',
    sex: 'Male',
    municipality: 'Mabitac',
    barangay: 'Maligaya',
    completeAddress: '90 Greenfield Ave., Brgy. Maligaya, Mabitac, Laguna',
    location: '14.435800,121.434200',
    skills: 'Irrigation Support, Agricultural Technology, Tree Planting',
    emergencyContactName: 'Gina Dela Cruz',
    emergencyContactNumber: '09292013999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'stephanie.bautista@lspu.edu.ph',
    fullName: 'Stephanie Marie G. Bautista',
    studentNumber: '0226-2014',
    course: 'BSBA',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09302014014',
    birthdate: '2007-09-09',
    sex: 'Female',
    municipality: 'Mabitac',
    barangay: 'Pag-asa',
    completeAddress: '12 Poblacion Outer Rd., Brgy. Pag-asa, Mabitac, Laguna',
    location: '14.425900,121.426400',
    skills: 'Financial Bookkeeping, Logistics, Community Organizing',
    emergencyContactName: 'Eduardo Bautista',
    emergencyContactNumber: '09302014999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'adrian.villanueva@lspu.edu.ph',
    fullName: 'Adrian Carl V. Villanueva',
    studentNumber: '0226-2015',
    course: 'BSCS',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09312015015',
    birthdate: '2006-11-28',
    sex: 'Male',
    municipality: 'Mabitac',
    barangay: 'San Antonio',
    completeAddress: '44 San Antonio St., Brgy. San Antonio, Mabitac, Laguna',
    location: '14.433100,121.429800',
    skills: 'Data Analysis, Programming, Technical Documentation',
    emergencyContactName: 'Melinda Villanueva',
    emergencyContactNumber: '09312015999',
    emergencyContactRelationship: 'Mother'
  },

  // Santa Maria
  {
    email: 'trisha.morales@lspu.edu.ph',
    fullName: 'Trisha Mae H. Morales',
    studentNumber: '0226-2016',
    course: 'BSED',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09322016016',
    birthdate: '2007-03-08',
    sex: 'Female',
    municipality: 'Santa Maria',
    barangay: 'Cabooan',
    completeAddress: '109 Real St., Brgy. Cabooan, Santa Maria, Laguna',
    location: '14.468200,121.421500',
    skills: 'English Tutoring, Speech Coaching, Educational Support',
    emergencyContactName: 'Oscar Morales',
    emergencyContactNumber: '09322016999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'kevin.soriano@lspu.edu.ph',
    fullName: 'Kevin Troy B. Soriano',
    studentNumber: '0226-2017',
    course: 'BSA (Agri)',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09332017017',
    birthdate: '2006-05-14',
    sex: 'Male',
    municipality: 'Santa Maria',
    barangay: 'Bagumbayan',
    completeAddress: '37 Mountain View Rd., Brgy. Bagumbayan, Santa Maria, Laguna',
    location: '14.472100,121.424800',
    skills: 'Crop Management, Organic Farming, Soil Conservation',
    emergencyContactName: 'Norma Soriano',
    emergencyContactNumber: '09332017999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'nicole.alvarez@lspu.edu.ph',
    fullName: 'Nicole Grace D. Alvarez',
    studentNumber: '0226-2018',
    course: 'BSHM',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09342018018',
    birthdate: '2007-12-01',
    sex: 'Female',
    municipality: 'Santa Maria',
    barangay: 'Coralan',
    completeAddress: '83 Highland Drive, Brgy. Coralan, Santa Maria, Laguna',
    location: '14.475600,121.427900',
    skills: 'Sanitation, First Aid, Food Safety Management',
    emergencyContactName: 'Benito Alvarez',
    emergencyContactNumber: '09342018999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'daniel.castro@lspu.edu.ph',
    fullName: 'Daniel Joseph R. Castro',
    studentNumber: '0226-2019',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09352019019',
    birthdate: '2006-07-19',
    sex: 'Male',
    municipality: 'Santa Maria',
    barangay: 'J. Santiago',
    completeAddress: '56 Santiago Blvd., Brgy. J. Santiago, Santa Maria, Laguna',
    location: '14.469800,121.419200',
    skills: 'Computer Literacy, Video Editing, Presentation Design',
    emergencyContactName: 'Rowena Castro',
    emergencyContactNumber: '09352019999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'erika.pascual@lspu.edu.ph',
    fullName: 'Erika Jean M. Pascual',
    studentNumber: '0226-2020',
    course: 'BSPsyc',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09362020020',
    birthdate: '2007-06-11',
    sex: 'Female',
    municipality: 'Santa Maria',
    barangay: 'Paoo',
    completeAddress: '19 Valley View, Brgy. Paoo, Santa Maria, Laguna',
    location: '14.478900,121.431200',
    skills: 'Community Outreach, Active Listening, Health Education',
    emergencyContactName: 'Ferdinand Pascual',
    emergencyContactNumber: '09362020999',
    emergencyContactRelationship: 'Father'
  },

  // Pangil
  {
    email: 'justin.corpuz@lspu.edu.ph',
    fullName: 'Justin Dave L. Corpuz',
    studentNumber: '0226-2021',
    course: 'BSCrim',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09372021021',
    birthdate: '2006-10-04',
    sex: 'Male',
    municipality: 'Pangil',
    barangay: 'Balian',
    completeAddress: '72 Coastal Rd., Brgy. Balian, Pangil, Laguna',
    location: '14.407200,121.481200',
    skills: 'Disaster Risk Reduction, Physical Training, First Aid',
    emergencyContactName: 'Rosario Corpuz',
    emergencyContactNumber: '09372021999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'chloe.salazar@lspu.edu.ph',
    fullName: 'Chloe Bianca S. Salazar',
    studentNumber: '0226-2022',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09382022022',
    birthdate: '2007-04-18',
    sex: 'Female',
    municipality: 'Pangil',
    barangay: 'Sulib',
    completeAddress: '15 Rizal Memorial Way, Brgy. Sulib, Pangil, Laguna',
    location: '14.404500,121.478200',
    skills: 'Computer Literacy, Graphic Design, Social Media Documentation',
    emergencyContactName: 'Hernando Salazar',
    emergencyContactNumber: '09382022999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'elias.marquez@lspu.edu.ph',
    fullName: 'Elias Mateo C. Marquez',
    studentNumber: '0226-2023',
    course: 'BSCpE',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09392023023',
    birthdate: '2006-02-23',
    sex: 'Male',
    municipality: 'Pangil',
    barangay: 'Dambo',
    completeAddress: '38 Riverside Alley, Brgy. Dambo, Pangil, Laguna',
    location: '14.409800,121.484100',
    skills: 'Computer Hardware, Electrical Basics, Community Organizing',
    emergencyContactName: 'Cynthia Marquez',
    emergencyContactNumber: '09392023999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'monica.evangelista@lspu.edu.ph',
    fullName: 'Monica Sophia P. Evangelista',
    studentNumber: '0226-2024',
    course: 'BSED',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09402024024',
    birthdate: '2007-08-27',
    sex: 'Female',
    municipality: 'Pangil',
    barangay: 'Isla',
    completeAddress: '64 Water Lily Rd., Brgy. Isla, Pangil, Laguna',
    location: '14.402100,121.475400',
    skills: 'Mathematics Tutoring, Group Facilitation, Documentation',
    emergencyContactName: 'Gregorio Evangelista',
    emergencyContactNumber: '09402024999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'rafael.santiago@lspu.edu.ph',
    fullName: 'Rafael Antonio T. Santiago',
    studentNumber: '0226-2025',
    course: 'BSA (Agri)',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09412025025',
    birthdate: '2006-12-05',
    sex: 'Male',
    municipality: 'Pangil',
    barangay: 'Natunawan',
    completeAddress: '91 Farm Trail, Brgy. Natunawan, Pangil, Laguna',
    location: '14.412500,121.487600',
    skills: 'Horticulture, Tree Planting, Composting & Waste Management',
    emergencyContactName: 'Leonora Santiago',
    emergencyContactNumber: '09412025999',
    emergencyContactRelationship: 'Mother'
  },

  // Pakil
  {
    email: 'hannah.gutierrez@lspu.edu.ph',
    fullName: 'Hannah Ysabelle M. Gutierrez',
    studentNumber: '0226-2026',
    course: 'BSCS',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09422026026',
    birthdate: '2007-03-24',
    sex: 'Female',
    municipality: 'Pakil',
    barangay: 'Baño',
    completeAddress: '28 Tavera Extension, Brgy. Baño, Pakil, Laguna',
    location: '14.383500,121.479500',
    skills: 'Software Troubleshooting, Database Entry, Media Production',
    emergencyContactName: 'Rodolfo Gutierrez',
    emergencyContactNumber: '09422026999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'kurt.dela_rosa@lspu.edu.ph',
    fullName: 'Kurt Russell A. Dela Rosa',
    studentNumber: '0226-2027',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09432027027',
    birthdate: '2006-04-15',
    sex: 'Male',
    municipality: 'Pakil',
    barangay: 'Burgos',
    completeAddress: '11 Padre Burgos St., Brgy. Burgos, Pakil, Laguna',
    location: '14.381200,121.478100',
    skills: 'Computer Literacy, Networking Basics, Documentation',
    emergencyContactName: 'Vilma Dela Rosa',
    emergencyContactNumber: '09432027999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'alyanna.ibanez@lspu.edu.ph',
    fullName: 'Alyanna Denise F. Ibañez',
    studentNumber: '0226-2028',
    course: 'BSTM',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09442028028',
    birthdate: '2007-09-17',
    sex: 'Female',
    municipality: 'Pakil',
    barangay: 'Gonzales',
    completeAddress: '49 Gonzales Court, Brgy. Gonzales, Pakil, Laguna',
    location: '14.384800,121.480200',
    skills: 'Event Hosting, Heritage Preservation, Public Relations',
    emergencyContactName: 'Nestor Ibañez',
    emergencyContactNumber: '09442028999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'samuel.aquino@lspu.edu.ph',
    fullName: 'Samuel James E. Aquino',
    studentNumber: '0226-2029',
    course: 'BSBA',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09452029029',
    birthdate: '2006-08-30',
    sex: 'Male',
    municipality: 'Pakil',
    barangay: 'Matikiw',
    completeAddress: '77 Hillside Drive, Brgy. Matikiw, Pakil, Laguna',
    location: '14.387200,121.482400',
    skills: 'Marketing, Community Organizing, Inventory Management',
    emergencyContactName: 'Leticia Aquino',
    emergencyContactNumber: '09452029999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'camille.enriquez@lspu.edu.ph',
    fullName: 'Camille Joy N. Enriquez',
    studentNumber: '0226-2030',
    course: 'BEED',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09462030030',
    birthdate: '2007-01-05',
    sex: 'Female',
    municipality: 'Pakil',
    barangay: 'Rizal',
    completeAddress: '33 Dr. Jose Rizal Way, Brgy. Rizal, Pakil, Laguna',
    location: '14.380100,121.477000',
    skills: 'Reading Remediation, Early Childhood Care, Music & Arts',
    emergencyContactName: 'Arturo Enriquez',
    emergencyContactNumber: '09462030999',
    emergencyContactRelationship: 'Father'
  },

  // Paete
  {
    email: 'dominic.alcantara@lspu.edu.ph',
    fullName: 'Dominic John S. Alcantara',
    studentNumber: '0226-2031',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09472031031',
    birthdate: '2006-07-07',
    sex: 'Male',
    municipality: 'Paete',
    barangay: 'Quinale',
    completeAddress: '105 Woodcarvers Way, Brgy. Quinale, Paete, Laguna',
    location: '14.364800,121.484200',
    skills: 'Computer Literacy, 3D Modeling Concepts, Documentation',
    emergencyContactName: 'Soledad Alcantara',
    emergencyContactNumber: '09472031999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'mariella.beltran@lspu.edu.ph',
    fullName: 'Mariella Kate B. Beltran',
    studentNumber: '0226-2032',
    course: 'BSHM',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09482032032',
    birthdate: '2007-11-23',
    sex: 'Female',
    municipality: 'Paete',
    barangay: 'Maytoong',
    completeAddress: '42 Artisans Lane, Brgy. Maytoong, Paete, Laguna',
    location: '14.362100,121.482900',
    skills: 'Culinary Support, Hygiene & Sanitation, First Aid',
    emergencyContactName: 'Gerardo Beltran',
    emergencyContactNumber: '09482032999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'lance.villanueva@lspu.edu.ph',
    fullName: 'Lance Christopher R. Villanueva',
    studentNumber: '0226-2033',
    course: 'BSCpE',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09492033033',
    birthdate: '2006-01-16',
    sex: 'Male',
    municipality: 'Paete',
    barangay: 'Bangkusay',
    completeAddress: '88 Lake Shore Rd., Brgy. Bangkusay, Paete, Laguna',
    location: '14.366500,121.485600',
    skills: 'Electronics, Technical Assembly, Community Organizing',
    emergencyContactName: 'Teresita Villanueva',
    emergencyContactNumber: '09492033999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'angeline.dimaculangan@lspu.edu.ph',
    fullName: 'Angeline Claire M. Dimaculangan',
    studentNumber: '0226-2034',
    course: 'BSED',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09502034034',
    birthdate: '2007-06-30',
    sex: 'Female',
    municipality: 'Paete',
    barangay: 'Ilaya del Norte',
    completeAddress: '17 Upper Mountain Path, Brgy. Ilaya del Norte, Paete, Laguna',
    location: '14.368900,121.487100',
    skills: 'Filipino Literature Tutoring, Creative Writing, Event Coordination',
    emergencyContactName: 'Marcelo Dimaculangan',
    emergencyContactNumber: '09502034999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'sean.esguerra@lspu.edu.ph',
    fullName: 'Sean Patrick D. Esguerra',
    studentNumber: '0226-2035',
    course: 'BSCrim',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09512035035',
    birthdate: '2006-09-12',
    sex: 'Male',
    municipality: 'Paete',
    barangay: 'Ibaba del Sur',
    completeAddress: '53 Southern Coastal Path, Brgy. Ibaba del Sur, Paete, Laguna',
    location: '14.360200,121.481500',
    skills: 'Search & Rescue, Physical Endurance, Emergency First Aid',
    emergencyContactName: 'Remedios Esguerra',
    emergencyContactNumber: '09512035999',
    emergencyContactRelationship: 'Mother'
  },

  // Kalayaan
  {
    email: 'francis.robles@lspu.edu.ph',
    fullName: 'Francis Kenneth V. Robles',
    studentNumber: '0226-2036',
    course: 'BSABE',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09522036036',
    birthdate: '2006-04-29',
    sex: 'Male',
    municipality: 'Kalayaan',
    barangay: 'San Juan',
    completeAddress: '12 Hydro Power Rd., Brgy. San Juan, Kalayaan, Laguna',
    location: '14.351200,121.502100',
    skills: 'Renewable Energy Awareness, Watershed Conservation, Tree Planting',
    emergencyContactName: 'Emilio Robles',
    emergencyContactNumber: '09522036999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'bea.manalo@lspu.edu.ph',
    fullName: 'Bea Andrea G. Manalo',
    studentNumber: '0226-2037',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09532037037',
    birthdate: '2007-08-04',
    sex: 'Female',
    municipality: 'Kalayaan',
    barangay: 'San Antonio',
    completeAddress: '68 Caliraya Overlook, Brgy. San Antonio, Kalayaan, Laguna',
    location: '14.348900,121.514500',
    skills: 'Computer Literacy, Database Management, Presentation Design',
    emergencyContactName: 'Marilou Manalo',
    emergencyContactNumber: '09532037999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'leo.padilla@lspu.edu.ph',
    fullName: 'Leo Anthony C. Padilla',
    studentNumber: '0226-2038',
    course: 'BSA (Agri)',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09542038038',
    birthdate: '2006-11-14',
    sex: 'Male',
    municipality: 'Kalayaan',
    barangay: 'Longos',
    completeAddress: '95 Caliraya Ridge Way, Brgy. Longos, Kalayaan, Laguna',
    location: '14.355600,121.498200',
    skills: 'Forestry Support, Agro-Tourism, Soil Management',
    emergencyContactName: 'Arnulfo Padilla',
    emergencyContactNumber: '09542038999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'daphne.mercado@lspu.edu.ph',
    fullName: 'Daphne Nicole T. Mercado',
    studentNumber: '0226-2039',
    course: 'BSPsyc',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09552039039',
    birthdate: '2007-02-18',
    sex: 'Female',
    municipality: 'Kalayaan',
    barangay: 'San Juan',
    completeAddress: '43 Lakeside Villas, Brgy. San Juan, Kalayaan, Laguna',
    location: '14.353400,121.505600',
    skills: 'Youth Counseling Support, Mental Health Advocacy, First Aid',
    emergencyContactName: 'Lilian Mercado',
    emergencyContactNumber: '09552039999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'carlo.matias@lspu.edu.ph',
    fullName: 'Carlo Angelo P. Matias',
    studentNumber: '0226-2040',
    course: 'BSCS',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09562040040',
    birthdate: '2006-03-22',
    sex: 'Male',
    municipality: 'Kalayaan',
    barangay: 'Longos',
    completeAddress: '18 Mountain Stream Rd., Brgy. Longos, Kalayaan, Laguna',
    location: '14.357100,121.496500',
    skills: 'Data Entry, Web Literacy, Environmental Mapping',
    emergencyContactName: 'Vicente Matias',
    emergencyContactNumber: '09562040999',
    emergencyContactRelationship: 'Father'
  },

  // Lumban
  {
    email: 'alyssa.ferrer@lspu.edu.ph',
    fullName: 'Alyssa Marie B. Ferrer',
    studentNumber: '0226-2041',
    course: 'BSED',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09572041041',
    birthdate: '2007-05-16',
    sex: 'Female',
    municipality: 'Lumban',
    barangay: 'Balubad',
    completeAddress: '24 Embroidery Lane, Brgy. Balubad, Lumban, Laguna',
    location: '14.301200,121.458900',
    skills: 'Arts & Crafts, Embroidery Teaching, Community Organizing',
    emergencyContactName: 'Felicidad Ferrer',
    emergencyContactNumber: '09572041999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'gerald.tolentino@lspu.edu.ph',
    fullName: 'Gerald Bryan S. Tolentino',
    studentNumber: '0226-2042',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09582042042',
    birthdate: '2006-10-10',
    sex: 'Male',
    municipality: 'Lumban',
    barangay: 'Concepcion',
    completeAddress: '81 National Highway, Brgy. Concepcion, Lumban, Laguna',
    location: '14.298500,121.461200',
    skills: 'Computer Literacy, Media Documentation, Digital Recordkeeping',
    emergencyContactName: 'Bernardo Tolentino',
    emergencyContactNumber: '09582042999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'joanna.cordero@lspu.edu.ph',
    fullName: 'Joanna Rose L. Cordero',
    studentNumber: '0226-2043',
    course: 'BSBA',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09592043043',
    birthdate: '2007-07-12',
    sex: 'Female',
    municipality: 'Lumban',
    barangay: 'Lewin',
    completeAddress: '15 Lake Shore Drive, Brgy. Lewin, Lumban, Laguna',
    location: '14.305600,121.464500',
    skills: 'Financial Bookkeeping, Small Business Mentoring, Health Education',
    emergencyContactName: 'Concepcion Cordero',
    emergencyContactNumber: '09592043999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'harold.legazpi@lspu.edu.ph',
    fullName: 'Harold Dean C. Legazpi',
    studentNumber: '0226-2044',
    course: 'BSCrim',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09602044044',
    birthdate: '2006-12-24',
    sex: 'Male',
    municipality: 'Lumban',
    barangay: 'Primera Pulo',
    completeAddress: '76 Pulo Blvd., Brgy. Primera Pulo, Lumban, Laguna',
    location: '14.295400,121.457800',
    skills: 'Disaster Emergency Response, First Aid, Physical Fitness',
    emergencyContactName: 'Danilo Legazpi',
    emergencyContactNumber: '09602044999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'claire.estrada@lspu.edu.ph',
    fullName: 'Claire Angela D. Estrada',
    studentNumber: '0226-2045',
    course: 'BSTM',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09612045045',
    birthdate: '2007-09-03',
    sex: 'Female',
    municipality: 'Lumban',
    barangay: 'Segunda Pulo',
    completeAddress: '39 Riverbanks Way, Brgy. Segunda Pulo, Lumban, Laguna',
    location: '14.293800,121.455900',
    skills: 'Eco-Tourism Promotion, Public Speaking, Event Management',
    emergencyContactName: 'Marilyn Estrada',
    emergencyContactNumber: '09612045999',
    emergencyContactRelationship: 'Mother'
  },

  // Pagsanjan
  {
    email: 'nathan.ocampo@lspu.edu.ph',
    fullName: 'Nathan Gabriel R. Ocampo',
    studentNumber: '0226-2046',
    course: 'BSHM',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09622046046',
    birthdate: '2006-08-17',
    sex: 'Male',
    municipality: 'Pagsanjan',
    barangay: 'Biñan',
    completeAddress: '55 Falls Access Rd., Brgy. Biñan, Pagsanjan, Laguna',
    location: '14.275400,121.453200',
    skills: 'First Aid, Water Safety, Customer & Visitor Hospitality',
    emergencyContactName: 'Ricardo Ocampo',
    emergencyContactNumber: '09622046999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'vanessa.samson@lspu.edu.ph',
    fullName: 'Vanessa Mae T. Samson',
    studentNumber: '0226-2047',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09632047047',
    birthdate: '2007-04-09',
    sex: 'Female',
    municipality: 'Pagsanjan',
    barangay: 'Cabanbanan',
    completeAddress: '108 Historic Arch Blvd., Brgy. Cabanbanan, Pagsanjan, Laguna',
    location: '14.278900,121.457800',
    skills: 'Computer Literacy, Graphic Design, Web Information Search',
    emergencyContactName: 'Josefina Samson',
    emergencyContactNumber: '09632047999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'jayson.lazaro@lspu.edu.ph',
    fullName: 'Jayson Kyle P. Lazaro',
    studentNumber: '0226-2048',
    course: 'BSCpE',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09642048048',
    birthdate: '2006-02-11',
    sex: 'Male',
    municipality: 'Pagsanjan',
    barangay: 'Magdapio',
    completeAddress: '23 River Rapids Path, Brgy. Magdapio, Pagsanjan, Laguna',
    location: '14.269800,121.464500',
    skills: 'Technical Maintenance, Solar & Electrical Basics, First Aid',
    emergencyContactName: 'Crisanto Lazaro',
    emergencyContactNumber: '09642048999',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'kassandra.padua@lspu.edu.ph',
    fullName: 'Kassandra Nicole G. Padua',
    studentNumber: '0226-2049',
    course: 'BEED',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09652049049',
    birthdate: '2007-10-31',
    sex: 'Female',
    municipality: 'Pagsanjan',
    barangay: 'Maulawin',
    completeAddress: '67 Pagsanjan Royal St., Brgy. Maulawin, Pagsanjan, Laguna',
    location: '14.272500,121.451200',
    skills: 'Child Literacy, Creative Storytelling, Educational Games',
    emergencyContactName: 'Evangeline Padua',
    emergencyContactNumber: '09652049999',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'zyan.bermudez@lspu.edu.ph',
    fullName: 'Zyan Matthew B. Bermudez',
    studentNumber: '0226-2050',
    course: 'BSCS',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09662050050',
    birthdate: '2006-06-27',
    sex: 'Male',
    municipality: 'Pagsanjan',
    barangay: 'Sampaloc',
    completeAddress: '92 Heritage Way, Brgy. Sampaloc, Pagsanjan, Laguna',
    location: '14.276800,121.455400',
    skills: 'Computer Literacy, Data Management, Documentation & Reporting',
    emergencyContactName: 'Teodoro Bermudez',
    emergencyContactNumber: '09662050999',
    emergencyContactRelationship: 'Father'
  }
];

async function seed50Students() {
  console.log(`=================================================================`);
  console.log(`Starting Seeding of 50 Ready-to-Deploy Students with Complete CMO`);
  console.log(`=================================================================`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const results = [];

  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    const indexStr = `[${i + 1}/${STUDENTS.length}]`;
    console.log(`\n${indexStr} Processing ${s.fullName} (${s.email})...`);

    try {
      let userId;

      // 1. Upsert `users` record
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', s.email)
        .single();

      if (existingUser) {
        userId = existingUser.user_id;
        await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            role: 'student',
            account_status: 'active',
            profile_status: 'complete',
            cmo_compliance_status: 'compliant',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        console.log(`   -> Updated existing user record: ${userId}`);
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: s.email,
            password_hash: hashedPassword,
            role: 'student',
            account_status: 'active',
            profile_status: 'complete',
            cmo_compliance_status: 'compliant',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('user_id')
          .single();

        if (userError) {
          throw new Error(`Failed to create user record: ${userError.message}`);
        }
        userId = newUser.user_id;
        console.log(`   -> Created new user record: ${userId}`);
      }

      // 2. Upsert `student_profiles`
      const profilePayload = {
        user_id: userId,
        full_name: s.fullName,
        student_number: s.studentNumber,
        course: s.course,
        year_level: s.yearLevel,
        section: s.section,
        nstp_component: 'CWTS',
        contact_number: s.contactNumber,
        birthdate: s.birthdate,
        sex: s.sex,
        complete_address: s.completeAddress,
        address: s.completeAddress,
        barangay: s.barangay,
        municipality: s.municipality,
        province: 'Laguna',
        location: s.location,
        skills: s.skills,
        emergency_contact_name: s.emergencyContactName,
        emergency_contact_number: s.emergencyContactNumber,
        emergency_contact_relationship: s.emergencyContactRelationship,
        updated_at: new Date().toISOString()
      };

      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('profile_id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        const { error: profileUpdateError } = await supabase
          .from('student_profiles')
          .update(profilePayload)
          .eq('profile_id', existingProfile.profile_id);

        if (profileUpdateError) {
          throw new Error(`Profile update error: ${profileUpdateError.message}`);
        }
        console.log(`   -> Profile updated.`);
      } else {
        profilePayload.created_at = new Date().toISOString();
        const { error: profileInsertError } = await supabase
          .from('student_profiles')
          .insert(profilePayload);

        if (profileInsertError) {
          throw new Error(`Profile insert error: ${profileInsertError.message}`);
        }
        console.log(`   -> Profile created.`);
      }

      // 3. Upsert all 4 approved CMO requirements
      for (const reqType of CMO_TYPES) {
        const username = s.email.split('@')[0];
        const cmoPayload = {
          user_id: userId,
          requirement_type: reqType,
          file_name: `${reqType}_${username}.jpg`,
          file_path: `cmo-submissions/${userId}/${reqType}.jpg`,
          file_url: `https://res.cloudinary.com/r10bgsfo/image/upload/v1793844583/nstp-connect/cmo-requirements/sample_${reqType}.jpg`,
          file_type: 'image/jpeg',
          file_size: 145200,
          status: 'approved',
          remarks: 'Verified and approved for deployment compliance.',
          uploaded_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          reviewed_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          reviewed_by: REVIEWER_ID,
          updated_at: new Date().toISOString()
        };

        const { data: existingCmo } = await supabase
          .from('student_cmo_requirements')
          .select('requirement_id')
          .eq('user_id', userId)
          .eq('requirement_type', reqType)
          .single();

        if (existingCmo) {
          await supabase
            .from('student_cmo_requirements')
            .update(cmoPayload)
            .eq('requirement_id', existingCmo.requirement_id);
        } else {
          cmoPayload.created_at = new Date().toISOString();
          await supabase
            .from('student_cmo_requirements')
            .insert(cmoPayload);
        }
      }
      console.log(`   -> 4 CMO Requirements approved.`);

      results.push({
        num: i + 1,
        studentNumber: s.studentNumber,
        name: s.fullName,
        email: s.email,
        course: s.course,
        section: s.section,
        municipality: s.municipality,
        cmoStatus: 'Fully Compliant',
        status: 'SUCCESS'
      });

    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      results.push({
        num: i + 1,
        studentNumber: s.studentNumber,
        name: s.fullName,
        email: s.email,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  console.log(`\n=================================================================`);
  console.log(`SEEDING COMPLETED SUMMARY:`);
  console.log(`=================================================================`);
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`Successfully created/updated: ${successCount} of ${STUDENTS.length} students.`);
  
  return results;
}

if (require.main === module) {
  seed50Students()
    .then(() => {
      console.log('Seeder process finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal seeder error:', err);
      process.exit(1);
    });
}

module.exports = { seed50Students };

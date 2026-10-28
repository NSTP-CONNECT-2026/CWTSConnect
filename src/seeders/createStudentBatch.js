const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');

const DEFAULT_PASSWORD = 'Test123!';
const REVIEWER_ID = '76dbbecd-4deb-4b6d-9c23-1f1e58df5916'; // NSTP Coordinator ID

const STUDENTS = [
  {
    email: 'alliah.villanueva@lspu.edu.ph',
    fullName: 'Alliah M. Villanueva',
    studentNumber: '0226-1001',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09171234501',
    birthdate: '2007-03-14',
    sex: 'Female',
    municipality: 'Famy',
    barangay: 'Batuhan',
    completeAddress: 'J.P. Rizal Street, Brgy. Batuhan, Famy, Laguna',
    location: '14.437250,121.451820',
    skills: 'Computer Literacy, Documentation',
    emergencyContactName: 'Maria Villanueva',
    emergencyContactNumber: '09171234500',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'imee.merin@lspu.edu.ph',
    fullName: 'Imee C. Merin',
    studentNumber: '0226-1002',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09281234502',
    birthdate: '2007-06-22',
    sex: 'Female',
    municipality: 'Siniloan',
    barangay: 'General Luna',
    completeAddress: 'M.H. Del Pilar Street, Brgy. General Luna, Siniloan, Laguna',
    location: '14.420830,121.447540',
    skills: 'First Aid, Health Education',
    emergencyContactName: 'Carlito Merin',
    emergencyContactNumber: '09281234500',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'ryanjhay.devera@lspu.edu.ph',
    fullName: 'Ryan Jhay P. De Vera',
    studentNumber: '0226-1003',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09361234503',
    birthdate: '2007-01-18',
    sex: 'Male',
    municipality: 'Pangil',
    barangay: 'Balian',
    completeAddress: 'National Highway, Brgy. Balian, Pangil, Laguna',
    location: '14.406120,121.479830',
    skills: 'Computer Literacy, Data Entry',
    emergencyContactName: 'Pedro De Vera',
    emergencyContactNumber: '09361234500',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'bea.jamito@lspu.edu.ph',
    fullName: 'Bea R. Jamito',
    studentNumber: '0226-1004',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09451234504',
    birthdate: '2007-08-30',
    sex: 'Female',
    municipality: 'Paete',
    barangay: 'Quinale',
    completeAddress: 'J. Rizal Street, Brgy. Quinale, Paete, Laguna',
    location: '14.364210,121.483950',
    skills: 'Environmental Awareness, Community Organizing',
    emergencyContactName: 'Rosa Jamito',
    emergencyContactNumber: '09451234500',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'dianneyvonne.marasigan@lspu.edu.ph',
    fullName: 'Dianne Yvonne T. Marasigan',
    studentNumber: '0226-1005',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section A',
    contactNumber: '09561234505',
    birthdate: '2007-11-12',
    sex: 'Female',
    municipality: 'Pakil',
    barangay: 'Baño',
    completeAddress: 'Tavera Street, Brgy. Baño, Pakil, Laguna',
    location: '14.382450,121.478900',
    skills: 'Event Management, Documentation',
    emergencyContactName: 'Teresa Marasigan',
    emergencyContactNumber: '09561234500',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'johnpaul.cuaterno@lspu.edu.ph',
    fullName: 'John Paul L. Cuaterno',
    studentNumber: '0226-1006',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09671234506',
    birthdate: '2007-04-05',
    sex: 'Male',
    municipality: 'Kalayaan',
    barangay: 'Longos',
    completeAddress: 'Manila East Road, Brgy. Longos, Kalayaan, Laguna',
    location: '14.352100,121.563800',
    skills: 'First Aid, Community Organizing',
    emergencyContactName: 'Glenn Cuaterno',
    emergencyContactNumber: '09671234500',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'alliza.aurelio@lspu.edu.ph',
    fullName: 'Alliza S. Aurelio',
    studentNumber: '0226-1007',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section C',
    contactNumber: '09781234507',
    birthdate: '2007-09-19',
    sex: 'Female',
    municipality: 'Mabitac',
    barangay: 'Pag-asa',
    completeAddress: 'Poblacion, Brgy. Pag-asa, Mabitac, Laguna',
    location: '14.428500,121.428300',
    skills: 'Computer Literacy, Health Education',
    emergencyContactName: 'Susan Aurelio',
    emergencyContactNumber: '09781234500',
    emergencyContactRelationship: 'Mother'
  },
  {
    email: 'ryzajoice.batol@lspu.edu.ph',
    fullName: 'Ryza Joice B. Batol',
    studentNumber: '0226-1008',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section D',
    contactNumber: '09891234508',
    birthdate: '2007-02-28',
    sex: 'Female',
    municipality: 'Siniloan',
    barangay: 'Salubungan',
    completeAddress: 'Castro Street, Brgy. Salubungan, Siniloan, Laguna',
    location: '14.417200,121.452100',
    skills: 'Documentation, Data Entry',
    emergencyContactName: 'Bernardo Batol',
    emergencyContactNumber: '09891234500',
    emergencyContactRelationship: 'Father'
  },
  {
    email: 'jennylyn.magpantay@lspu.edu.ph',
    fullName: 'Jennylyn D. Magpantay',
    studentNumber: '0226-1009',
    course: 'BSIT',
    yearLevel: '1st Year',
    section: 'Section B',
    contactNumber: '09901234509',
    birthdate: '2007-07-16',
    sex: 'Female',
    municipality: 'Famy',
    barangay: 'Tunhac',
    completeAddress: 'Real Street, Brgy. Tunhac, Famy, Laguna',
    location: '14.441800,121.453200',
    skills: 'Community Organizing, Environmental Awareness',
    emergencyContactName: 'Danilo Magpantay',
    emergencyContactNumber: '09901234500',
    emergencyContactRelationship: 'Father'
  }
];

const CMO_TYPES = [
  'validated_student_id',
  'notarized_parent_waiver',
  'valid_parent_id',
  'medical_certificate'
];

async function seedStudents() {
  console.log(`🚀 Starting student account creation for ${STUDENTS.length} students...`);
  console.log(`🔑 Default Password: ${DEFAULT_PASSWORD}`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const results = [];

  for (const s of STUDENTS) {
    try {
      console.log(`\n========================================`);
      console.log(`Processing: ${s.email} (${s.fullName})`);

      // 1. Create or fetch user in `users`
      let userId;
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id, email')
        .eq('email', s.email)
        .single();

      if (existingUser) {
        console.log(`ℹ️ User already exists with ID: ${existingUser.user_id}. Updating status...`);
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
        console.log(`✅ Created user account with ID: ${userId}`);
      }

      // 2. Insert or update `student_profiles`
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
          throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
        }
        console.log(`✅ Profile updated successfully.`);
      } else {
        profilePayload.created_at = new Date().toISOString();
        const { error: profileInsertError } = await supabase
          .from('student_profiles')
          .insert(profilePayload);

        if (profileInsertError) {
          throw new Error(`Failed to insert profile: ${profileInsertError.message}`);
        }
        console.log(`✅ Profile created successfully.`);
      }

      // 3. Insert or update 4 approved CMO requirements
      for (const reqType of CMO_TYPES) {
        const username = s.email.split('@')[0];
        const cmoPayload = {
          user_id: userId,
          requirement_type: reqType,
          file_name: `${reqType}_${username}.png`,
          file_path: `dummy/${userId}/${reqType}.png`,
          file_url: `https://via.placeholder.com/800x1000/145A3A/FFFFFF?text=${encodeURIComponent(s.fullName + ' - ' + reqType)}`,
          file_type: 'image/png',
          file_size: 215400,
          status: 'approved',
          remarks: null,
          uploaded_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          reviewed_at: new Date().toISOString(),
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
      console.log(`✅ 4 CMO Requirements approved and linked.`);

      results.push({
        email: s.email,
        name: s.fullName,
        studentNumber: s.studentNumber,
        municipality: s.municipality,
        section: s.section,
        status: 'SUCCESS'
      });

    } catch (err) {
      console.error(`❌ Error processing ${s.email}:`, err.message);
      results.push({
        email: s.email,
        name: s.fullName,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY OF CREATED ACCOUNTS:`);
  console.table(results);
}

if (require.main === module) {
  seedStudents()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error in seeder:', err);
      process.exit(1);
    });
}

module.exports = { seedStudents };

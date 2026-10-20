const supabase = require('../src/config/supabaseClient');

async function testSupabase() {
  console.log('Testing Supabase query latency...');
  
  const start1 = Date.now();
  const { data: d1, error: e1 } = await supabase.from('users').select('id, email, role').limit(5);
  console.log(`users table select: ${Date.now() - start1}ms (rows: ${d1?.length}, err: ${e1?.message})`);

  const start2 = Date.now();
  const { data: d2, error: e2 } = await supabase.from('student_profiles').select('id, full_name').limit(5);
  console.log(`student_profiles table select: ${Date.now() - start2}ms (rows: ${d2?.length}, err: ${e2?.message})`);

  const start3 = Date.now();
  const { data: d3, error: e3 } = await supabase.from('deployments').select('id, title').limit(5);
  console.log(`deployments table select: ${Date.now() - start3}ms (rows: ${d3?.length}, err: ${e3?.message})`);
}

testSupabase();

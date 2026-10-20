const supabase = require('../src/config/supabaseClient');

async function check() {
  const { data, error } = await supabase
    .from('deployments')
    .select('deployment_id, deployment_batch_name, deployment_status, deployment_start_date, deployment_end_date, created_at')
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Deployments count:', data.length);
    console.log('Sample deployments:', JSON.stringify(data, null, 2));
  }
}

check();

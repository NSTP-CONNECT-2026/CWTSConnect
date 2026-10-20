const supabase = require('../src/config/supabaseClient');

async function checkOfficial() {
  const { data: users, error } = await supabase
    .from('users')
    .select('user_id, email, role')
    .eq('role', 'community_official');

  console.log('Community Officials:', users);
  
  if (users && users.length > 0) {
    for (const u of users) {
      const { data: reqs } = await supabase
        .from('community_requests')
        .select('request_id, activity_title')
        .eq('user_id', u.user_id);
      console.log(`Requests for ${u.email}:`, reqs ? reqs.length : 0);
      if (reqs && reqs.length > 0) {
        const reqIds = reqs.map(r => r.request_id);
        const { data: deps } = await supabase
          .from('deployments')
          .select('deployment_id, deployment_batch_name, deployment_start_date, deployment_end_date, deployment_status')
          .in('request_id', reqIds);
        console.log(`Deployments for ${u.email}:`, deps);
      }
    }
  }
}

checkOfficial();

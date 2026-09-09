import { getSessionFromRequest } from '../lib/auth';

export async function getServerSideProps(context) {
  const session = getSessionFromRequest(context.req);
  return {
    redirect: {
      destination: session ? '/dashboard/consolidated' : '/login',
      permanent: false,
    },
  };
}

export default function Index() {
  return null;
}

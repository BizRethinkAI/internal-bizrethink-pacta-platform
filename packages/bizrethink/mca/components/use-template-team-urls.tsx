import { trpc } from '@documenso/trpc/react';
import { useMemo } from 'react';

export const useMcaTemplateTeamUrls = () => {
  const { data } = trpc.bizrethink.mcaTemplates.access.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  return useMemo(() => data?.teams.map((team) => team.url) ?? [], [data]);
};

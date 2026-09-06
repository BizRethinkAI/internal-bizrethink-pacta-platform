-- Run BEFORE and AFTER the move. Same query both times.
SELECT 'property' AS thing, "organisationId" AS org, NULL::text AS team, count(*)
  FROM "BizrethinkProperty" GROUP BY 1,2,3
UNION ALL SELECT 'matter', "organisationId", "teamId"::text, count(*)
  FROM "BizrethinkLeaseMatter" GROUP BY 1,2,3
UNION ALL SELECT 'documents', "organisationId", NULL::text, count(*)
  FROM "BizrethinkDocument" GROUP BY 1,2,3
UNION ALL SELECT 'flag:'||feature, "scopeId", NULL::text, count(*)
  FROM "BizrethinkFeatureAccess" GROUP BY 1,2,3
UNION ALL SELECT 'reviews (follow matterId)', NULL::text, NULL::text, count(*)
  FROM "BizrethinkLeaseReview" WHERE "matterId" = 'lease_matter_kdxfitilinkibbdw'
UNION ALL SELECT 'comments (follow reviewId)', NULL::text, NULL::text, count(*)
  FROM "BizrethinkReviewComment" c
  JOIN "BizrethinkLeaseReview" r ON r.id = c."reviewId"
 WHERE r."matterId" = 'lease_matter_kdxfitilinkibbdw'
ORDER BY 1,2;

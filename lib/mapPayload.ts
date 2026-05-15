export function mapActorPayloadToBackend(actorPayload: Record<string, unknown>) {
  const f: Record<string, unknown> = JSON.parse(JSON.stringify(actorPayload || {}));

  for (const k of [
    "personRoleSection","contactSection","personLocationSection",
    "companySection","companyKeywordSection","companySizeSection",
    "companyDomainSection","companyLocationSection","revenueSection",
    "runOptionsSection","resetProgress","dontSaveProgress","customOffset",
  ]) delete f[k];

  const assignAnyNone = (target: string, includes: string, excludes: string) => {
    const anyOf = Array.isArray(f[includes]) ? [...(f[includes] as unknown[])] : [];
    const noneOf = Array.isArray(f[excludes]) ? [...(f[excludes] as unknown[])] : [];
    delete f[includes];
    delete f[excludes];
    if (anyOf.length || noneOf.length) f[target] = { anyOf, noneOf };
  };

  assignAnyNone("personFirstName",  "personFirstNameIncludes",          "personFirstNameExcludes");
  assignAnyNone("personLastName",   "personLastNameIncludes",           "personLastNameExcludes");
  assignAnyNone("seniority",        "seniorityIncludes",                "seniorityExcludes");
  assignAnyNone("functionIncludes", "functionIncludes",                 "functionExcludes");
  assignAnyNone("emailStatus",      "emailStatusIncludes",              "emailStatusExcludes");
  assignAnyNone("personCountry",    "personLocationCountryIncludes",    "personLocationCountryExcludes");
  assignAnyNone("personState",      "personLocationStateIncludes",      "personLocationStateExcludes");
  assignAnyNone("personCity",       "personLocationCityIncludes",       "personLocationCityExcludes");
  assignAnyNone("companyName",      "companyNameIncludes",              "companyNameExcludes");
  assignAnyNone("companyIndustry",  "companyIndustryIncludes",          "companyIndustryExcludes");
  assignAnyNone("companyKeyword",   "companyKeywordIncludes",           "companyKeywordExcludes");
  assignAnyNone("companySize",      "companySizeIncludes",              "companySizeExcludes");
  assignAnyNone("companyCountry",   "companyLocationCountryIncludes",   "companyLocationCountryExcludes");
  assignAnyNone("companyState",     "companyLocationStateIncludes",     "companyLocationStateExcludes");
  assignAnyNone("companyCity",      "companyLocationCityIncludes",      "companyLocationCityExcludes");
  assignAnyNone("annualRevenue",    "annualRevenueIncludes",            "annualRevenueExcludes");
  assignAnyNone("fundingStage",     "fundingStageIncludes",             "fundingStageExcludes");

  // Domain — normalize and dedupe
  const domainIncludes = Array.isArray(f.companyDomainIncludes)
    ? [...new Set((f.companyDomainIncludes as string[]).map(d => d.trim().toLowerCase()))].filter(Boolean)
    : [];
  const domainExcludes = Array.isArray(f.companyDomainExcludes)
    ? [...new Set((f.companyDomainExcludes as string[]).map(d => d.trim().toLowerCase()))].filter(Boolean)
    : [];
  if (domainIncludes.length || domainExcludes.length) {
    f.companyDomain = { anyOf: domainIncludes, noneOf: domainExcludes };
  }
  delete f.companyDomainIncludes;
  delete f.companyDomainExcludes;

  // Employee range
  const min = parseNonNegativeInteger(f.companyEmployeeMin);
  const max = parseNonNegativeInteger(f.companyEmployeeMax);
  if (min !== null && max !== null && min > max) {
    delete f.companyEmployeeMin;
    delete f.companyEmployeeMax;
  } else {
    if (min !== null) f.companyEmployeeMin = min; else delete f.companyEmployeeMin;
    if (max !== null) f.companyEmployeeMax = max; else delete f.companyEmployeeMax;
  }

  if (f.hasEmail === false) delete f.hasEmail;
  if (f.hasPhone === false) delete f.hasPhone;

  return f;
}

function parseNonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

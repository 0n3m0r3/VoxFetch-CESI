/**
 * Registry of institutions supported via the Renater federation.
 *
 * entityId: the SAML entity ID of the institution's Identity Provider as
 *           registered in the Renater federation. This is the value selected
 *           in the Cyberlibris WAYF <select name="user_idp">.
 *
 *           Entity IDs are sourced from:
 *           https://discovery.renater.fr/renater/api.php?page=1&idp=&search=<term>
 */

export interface Institution {
  label: string;
  entityId: string;
}

export const SUPPORTED_INSTITUTIONS: Record<string, Institution> = {
  "univ-angers": {
    label: "Université d'Angers",
    entityId: "urn:mace:cru.fr:federation:univ-angers.fr",
  },
  "univ-bordeaux": {
    label: "Université de Bordeaux",
    entityId: "https://idp-ubx.u-bordeaux.fr/idp/shibboleth",
  },
  "univ-bordeaux-montaigne": {
    label: "Université Bordeaux Montaigne",
    entityId: "https://idp.u-bordeaux-montaigne.fr/idp/shibboleth",
  },
  "univ-caen": {
    label: "Université de Caen Normandie",
    entityId: "https://idp4.unicaen.fr/idp/shibboleth",
  },
  "univ-grenoble": {
    label: "Université Grenoble Alpes",
    entityId: "https://shibboleth.univ-grenoble-alpes.fr/idp/shibboleth",
  },
  "univ-lille": {
    label: "Université de Lille",
    entityId: "https://idp.univ-lille.fr/idp/shibboleth",
  },
  "univ-lorraine": {
    label: "Université de Lorraine",
    entityId: "https://idp3.univ-lorraine.fr/idp/shibboleth",
  },
  "univ-lyon1": {
    label: "Université Claude Bernard Lyon 1",
    entityId: "urn:mace:cru.fr:federation:univ-lyon1.fr",
  },
  "univ-lyon2": {
    label: "Université Lumière Lyon 2",
    entityId: "https://idp.univ-lyon2.fr/idp/shibboleth",
  },
  "univ-lyon3": {
    label: "Université Jean Moulin Lyon 3",
    entityId: "https://idp.univ-lyon3.fr/idp/shibboleth",
  },
  "univ-montpellier": {
    label: "Université de Montpellier",
    entityId: "https://federation.umontpellier.fr/idp/shibboleth",
  },
  "univ-montpellier3": {
    label: "Université Paul-Valéry Montpellier 3",
    entityId: "https://idp-v4.univ-montp3.fr/idp/shibboleth",
  },
  "univ-nantes": {
    label: "Nantes Université",
    entityId: "urn:mace:cru.fr:federation:univ-nantes.fr",
  },
  "univ-poitiers": {
    label: "Université de Poitiers",
    entityId: "https://idp.univ-poitiers.fr/idp/shibboleth",
  },
  "univ-rennes": {
    label: "Université de Rennes",
    entityId: "urn:mace:cru.fr:federation:univ-rennes1.fr",
  },
  "univ-rennes2": {
    label: "Université Rennes 2",
    entityId: "urn:mace:cru.fr:federation:uhb.fr",
  },
  "univ-rouen": {
    label: "Université de Rouen Normandie",
    entityId: "urn:mace:cru.fr:federation:univ-rouen.fr",
  },
  "univ-strasbourg": {
    label: "Université de Strasbourg",
    entityId: "https://idp.unistra.fr/idp/shibboleth",
  },
  "univ-toulouse3": {
    label: "Université Paul Sabatier (Toulouse 3)",
    entityId: "https://idp.univ-tlse3.fr/idp/shibboleth",
  },
  "univ-toulouse-capitole": {
    label: "Université Toulouse Capitole",
    entityId: "https://idp3.ut-capitole.fr/idp/shibboleth",
  },
  "univ-toulouse-jean-jaures": {
    label: "Université Toulouse Jean Jaurès",
    entityId: "https://ruhnu.univ-tlse2.fr/idp/shibboleth",
  },
};

export function listInstitutions(): Array<{ key: string } & Institution> {
  return Object.entries(SUPPORTED_INSTITUTIONS).map(([key, inst]) => ({
    key,
    ...inst,
  }));
}

import { schools } from '../../../../../packages/contracts/index.js';
export { schools };

export const findSchool = (id?: string | null) => schools.find(entry => entry.id === id);
export const schoolIdsInRegion = (region?: string) => schools.filter(entry => entry.region === region).map(entry => entry.id);

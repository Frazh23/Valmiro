/**
 * Compatibilita': le schermate non ancora riprogettate importano Testata.
 * L'header vero e' uno solo, in components/sistema/Header.tsx — qui non si
 * duplica niente, si inoltra. Quando /stime e /accedi passano al nuovo
 * linguaggio, questo file sparisce.
 */
export { default } from "./sistema/Header";

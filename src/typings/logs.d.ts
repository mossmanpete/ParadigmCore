/**
 * Object containing standard or frequently used log outputs and templates.
 */
interface MasterLogTemplates {
    [key: string]: LogTemplates;
}

/**
 * Nested log templates object, sectioned into errors and general messages.
 */
interface LogTemplates {
    errors?: LogTemplate;
    messages?: LogTemplate;
}

/**
 * An individual log template, or nested template.
 */
interface LogTemplate {
    [key: string]: string | any;
}

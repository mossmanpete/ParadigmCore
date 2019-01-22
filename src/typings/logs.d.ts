/**
 * Object containing standard or frequently used log outputs and templates.
 */
interface LogTemplates {
    [key: string]: SubLogTemplate;
}

/**
 * Nested log templates object, sectioned into errors and general messages.
 */
interface SubLogTemplate {
    errors?: MessageLogTemplate;
    messages?: MessageLogTemplate;
}

/**
 * An individual log template, or nested template.
 */
interface MessageLogTemplate {
    [key: string]: string | any;
}

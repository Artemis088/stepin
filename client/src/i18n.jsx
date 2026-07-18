import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/*
 * Lightweight i18n: English + Georgian. Language is remembered in localStorage
 * and applied app-wide via context. Use the useT() hook to get t(key, vars).
 * t() falls back to English, then to the raw key, so a missing translation
 * never blanks the UI.
 */

const LANG_KEY = 'stepin_lang';
export const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ka', label: 'ქარ' },
];

const dict = {
  en: {
    // shared
    'common.login': 'Log in',
    'common.logout': 'Log out',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.notifications': 'Notifications',
    'common.passwordMin': 'At least 6 characters',
    'common.emailInvalid': 'Enter a valid email address, e.g. name@example.com',
    'common.haveAccount': 'Already have an account?',
    'role.student': 'Student',
    'role.company': 'Company',
    'role.admin': 'Platform admin',
    'field.data': 'Data',
    'field.software': 'Software',
    'field.design': 'Design',
    'time.today': 'today',
    'time.overdue': 'overdue',
    'time.inDays': 'in {n}d',

    // landing
    'landing.tagline': 'Get your first step in.',
    'landing.subtitle':
      "Companies post small, real, sample-data tasks. Students do them to earn a verified track record and a foot in the door. It's an exchange — real work for real experience, fair and safe for both sides.",
    'landing.imStudent': "I'm a student",
    'landing.imCompany': "I'm a company",
    'landing.realTasks': 'Real tasks',
    'landing.realExperience': 'Real experience',
    'landing.verifiedRecord': 'Verified track record',
    'landing.returning': 'Returning user?',
    'landing.demoLogins': 'Demo logins (password',

    // login
    'login.title': 'Log in',
    'login.forgot': 'Forgot password?',
    'login.loggingIn': 'Logging in…',
    'login.welcomeBack': 'Welcome back',
    'login.newHere': 'New here?',
    'login.createAccount': 'Create an account',
    'login.quickDemo': 'Quick demo logins',

    // role select
    'role.title': "Choose how you'll use StepIn",
    'role.subtitle': 'Your role determines your whole experience, so pick deliberately.',
    'role.studentBlurb': 'Build a verified profile, apply to real tasks, and earn a track record that opens doors.',
    'role.companyBlurb': 'Post small scoped tasks, get real work done, and see talent before any hiring commitment.',

    // student signup
    'ss.step.account': 'Account',
    'ss.step.basic': 'Basic info',
    'ss.step.skills': 'Add skills',
    'ss.step.done': 'Done',
    'ss.title': 'Create your student account',
    'ss.subtitle': 'Real tasks, verified track record.',
    'ss.fullName': 'Full name',
    'ss.fillError': 'Fill in name, email and password',
    'ss.basicTitle': 'Basic info',
    'ss.fieldLabel': 'Your field (MVP: one vertical)',
    'ss.bio': 'Short bio',
    'ss.bioPlaceholder': '3rd-year student · exploring analytics',
    'ss.createAccount': 'Create account',
    'ss.creating': 'Creating…',
    'ss.skillsTitle': 'Add your skills',
    'ss.skillsInfo':
      "Unverified skills are visible but don't boost your ranking until you back them with evidence. You can always earn verification by completing a StepIn task.",
    'ss.skillPlaceholder': 'e.g. SQL',
    'ss.add': 'Add',
    'ss.verified': 'Verified',
    'ss.unverified': 'Unverified',
    'ss.certificate': 'Certificate',
    'ss.courseLink': 'Course link',
    'ss.earnByTask': 'Earn by task',
    'ss.noSkills': 'No skills yet — add one above.',
    'ss.finish': 'Finish',
    'ss.saving': 'Saving…',
    'ss.doneTitle': "You're all set",
    'ss.doneText': 'Your profile is live. Browse tasks in your field and do a screening to get started.',
    'ss.browseTasks': 'Browse tasks',

    // company signup
    'cs.step.identity': 'Identity',
    'cs.step.contact': 'Contact',
    'cs.step.agreement': 'Agreement',
    'cs.step.done': 'Done',
    'cs.title': 'Company identity',
    'cs.subtitle': 'We verify legal registration to keep the marketplace safe.',
    'cs.legalName': 'Legal company name',
    'cs.regId': 'Registration / tax ID',
    'cs.website': 'Website',
    'cs.alreadyReg': 'Already registered?',
    'cs.contactTitle': 'Contact',
    'cs.domainInfo': 'Use a company-domain email (generic providers like gmail are not accepted).',
    'cs.contactName': 'Contact name',
    'cs.domainEmail': 'Company-domain email',
    'cs.accountPassword': 'Account password',
    'cs.emailInvalidCompany': 'Enter a valid email address, e.g. name@company.ge',
    'cs.agreementTitle': 'Partnership agreement',
    'cs.agreementIntro': 'By joining StepIn you agree to the partnership terms and per-task terms, covering:',
    'cs.agreement1': 'IP assignment only via a signed agreement, with a mandatory student portfolio carve-out.',
    'cs.agreement2': 'Anti-harvest / non-solicitation: tasks must be small, scoped and non-sensitive.',
    'cs.agreement3': 'Confidentiality and sample-data-only posting.',
    'cs.agreement4': 'Meeting your decision deadlines — repeatedly missing them affects your standing.',
    'cs.accept': 'I accept the partnership agreement and per-task terms.',
    'cs.createCompany': 'Create company account',
    'cs.submitting': 'Submitting…',
    'cs.probationTag': 'Probation — limited posting rights',
    'cs.doneTitle': "You're in",
    'cs.doneText':
      'New companies start on probation with a cap of 3 concurrent tasks. Full rights are earned by engaging — giving feedback, selecting winners, and meeting your decision deadlines.',
    'cs.goDashboard': 'Go to dashboard',

    // app shell / nav
    'nav.internships': 'Internships',
    'nav.tasks': 'Tasks',
    'nav.myApplications': 'My applications',
    'nav.profile': 'Profile',
    'nav.dashboard': 'Dashboard',
    'nav.postTask': 'Post a task',
    'nav.myTasks': 'My tasks',
    'nav.companyProfile': 'Company profile',
    'nav.overview': 'Overview',
    'nav.companyVetting': 'Company vetting',
    'nav.sensitivity': 'Sensitivity',
    'nav.templates': 'Templates',
    'nav.scoringSlots': 'Scoring & slots',
    'nav.disputes': 'Disputes & no-shows',
    'shell.footer1': 'Get your first step in.',
    'shell.footer2': 'Real tasks · verified track record.',

    // student tasks
    'tasks.title': 'Tasks',
    'tasks.subtitle': 'Real, small, sample-data tasks in your field.',
    'tasks.search': 'Search tasks',
    'tasks.allFields': 'All fields',
    'tasks.anyMotive': 'Any motive',
    'tasks.paidOrUnpaid': 'Paid or unpaid',
    'tasks.stipendOnly': 'Stipend only',
    'tasks.noMatch': 'No tasks match your filters',
    'tasks.sampleData': 'Sample data',
    'tasks.credential': 'Credential',
    'tasks.stipendSuffix': 'stipend',
    'tasks.verified': 'Verified',
    'tasks.applied': 'Applied',
    'tasks.applicationsClose': 'Applications close',
    'tasks.appliedOfCap': '{n} / {m} applied',
    'tasks.tabInternships': 'Internships',
    'tasks.tabStandalone': 'Tasks',
    'tasks.internshipsSubtitle': 'Real internships you enter through a trial task — the winning finalist is hired.',
    'tasks.standaloneSubtitle': 'One-off tasks that build your verified profile. No guaranteed internship.',
    'tasks.internshipBadge': 'Internship',
    'tasks.guaranteedHire': 'Winner hired',
    'tasks.noInternships': 'No internships match your filters',
    'motive.needs_now': 'Needs it now',
    'motive.scouting': 'Scouting talent',

    // company dashboard
    'cd.subtitle': 'Your live tasks and where each one stands.',
    'cd.postTask': 'Post a task',
    'cd.atCap': 'At your concurrent-task cap ({n}).',
    'cd.probationLabel': 'Probation — limited posting rights',
    'cd.trustedLabel': 'Trusted company',
    'cd.flaggedLabel': 'Flagged — posting restricted',
    'cd.tasksUsed': '{open} of {cap} tasks used',
    'cd.probationText':
      'You can post up to your cap while on probation. Unlock full posting rights by staying engaged: give screening feedback, select winners, and meet your decision deadlines.',
    'cd.trustedText': 'Full posting rights. Keep meeting decision deadlines to stay trusted.',
    'cd.flaggedText': 'Posting is restricted while your standing is under review. Resolve open decisions to recover.',
    'cd.activeTasks': 'Active tasks',
    'cd.noTasks': 'No tasks yet',
    'cd.postFirst': 'Post your first task',
    'cd.applied': 'applied',
    'cd.screened': 'screened',
    'cd.shortlistReady': 'shortlist ready',
    'cd.reviewShortlist': 'Review shortlist',
    'cd.decideBy': 'You decide by',
    'cd.screeningDue': 'Screening due',
    'cd.applicationsClose': 'Applications close',
    'cd.overdue': 'overdue',

    // admin overview
    'ao.title': 'Overview',
    'ao.subtitle': 'Platform operations — vetting, sensitivity, templates, scoring and disputes.',
    'ao.companies': 'Companies',
    'ao.students': 'Students',
    'ao.tasks': 'Tasks',
    'ao.onProbation': 'On probation',
    'ao.openIncidents': 'Open incidents',
    'ao.flaggedCompanies': 'Flagged companies',
    'ao.goTo': 'Go to',
    'ao.companyVetting': 'Company vetting',
    'ao.taskSensitivity': 'Task sensitivity',
    'ao.screeningTemplates': 'Screening templates',
    'ao.scoringSlots': 'Scoring & slots',
    'ao.disputes': 'Disputes & no-shows',
  },

  ka: {
    // shared
    'common.login': 'შესვლა',
    'common.logout': 'გასვლა',
    'common.continue': 'გაგრძელება',
    'common.back': 'უკან',
    'common.email': 'ელფოსტა',
    'common.password': 'პაროლი',
    'common.notifications': 'შეტყობინებები',
    'common.passwordMin': 'მინიმუმ 6 სიმბოლო',
    'common.emailInvalid': 'შეიყვანე სწორი ელფოსტა, მაგ. name@example.com',
    'common.haveAccount': 'უკვე გაქვს ანგარიში?',
    'role.student': 'სტუდენტი',
    'role.company': 'კომპანია',
    'role.admin': 'პლატფორმის ადმინი',
    'field.data': 'მონაცემები',
    'field.software': 'პროგრამირება',
    'field.design': 'დიზაინი',
    'time.today': 'დღეს',
    'time.overdue': 'ვადაგადაცილებული',
    'time.inDays': '{n} დღეში',

    // landing
    'landing.tagline': 'გადადგი შენი პირველი ნაბიჯი.',
    'landing.subtitle':
      'კომპანიები აქვეყნებენ მცირე, რეალურ დავალებებს სანიმუშო მონაცემებით. სტუდენტები ასრულებენ მათ, რათა მოიპოვონ დადასტურებული გამოცდილება და პირველი შესაძლებლობა. ეს არის გაცვლა — რეალური სამუშაო რეალური გამოცდილების სანაცვლოდ, სამართლიანი და უსაფრთხო ორივე მხარისთვის.',
    'landing.imStudent': 'მე სტუდენტი ვარ',
    'landing.imCompany': 'ჩვენ კომპანია ვართ',
    'landing.realTasks': 'რეალური დავალებები',
    'landing.realExperience': 'რეალური გამოცდილება',
    'landing.verifiedRecord': 'დადასტურებული გამოცდილება',
    'landing.returning': 'უკვე დარეგისტრირებული ხარ?',
    'landing.demoLogins': 'დემო ანგარიშები (პაროლი',

    // login
    'login.title': 'შესვლა',
    'login.forgot': 'დაგავიწყდა პაროლი?',
    'login.loggingIn': 'მიმდინარეობს…',
    'login.welcomeBack': 'კეთილი იყოს დაბრუნება',
    'login.newHere': 'ახალი ხარ აქ?',
    'login.createAccount': 'შექმენი ანგარიში',
    'login.quickDemo': 'სწრაფი დემო შესვლა',

    // role select
    'role.title': 'აირჩიე, როგორ გამოიყენებ StepIn-ს',
    'role.subtitle': 'შენი როლი განსაზღვრავს მთელ გამოცდილებას, ამიტომ აირჩიე გააზრებულად.',
    'role.studentBlurb': 'შექმენი დადასტურებული პროფილი, განაცხადე რეალურ დავალებებზე და მოიპოვე გამოცდილება, რომელიც კარებს გაგიღებს.',
    'role.companyBlurb': 'გამოაქვეყნე მცირე, კონკრეტული დავალებები, შეასრულებინე რეალური სამუშაო და დაინახე ტალანტი დაქირავებამდე.',

    // student signup
    'ss.step.account': 'ანგარიში',
    'ss.step.basic': 'ძირითადი ინფო',
    'ss.step.skills': 'უნარები',
    'ss.step.done': 'დასრულდა',
    'ss.title': 'შექმენი სტუდენტის ანგარიში',
    'ss.subtitle': 'რეალური დავალებები, დადასტურებული გამოცდილება.',
    'ss.fullName': 'სახელი და გვარი',
    'ss.fillError': 'შეავსე სახელი, ელფოსტა და პაროლი',
    'ss.basicTitle': 'ძირითადი ინფო',
    'ss.fieldLabel': 'შენი სფერო',
    'ss.bio': 'მოკლე ბიოგრაფია',
    'ss.bioPlaceholder': 'მე-3 კურსის სტუდენტი · ვსწავლობ ანალიტიკას',
    'ss.createAccount': 'ანგარიშის შექმნა',
    'ss.creating': 'იქმნება…',
    'ss.skillsTitle': 'დაამატე უნარები',
    'ss.skillsInfo':
      'დაუდასტურებელი უნარები ჩანს, მაგრამ არ ზრდის შენს რეიტინგს, სანამ არ დაადასტურებ მტკიცებულებით. დადასტურება ყოველთვის შეგიძლია StepIn-ის დავალების შესრულებით.',
    'ss.skillPlaceholder': 'მაგ. SQL',
    'ss.add': 'დამატება',
    'ss.verified': 'დადასტურებული',
    'ss.unverified': 'დაუდასტურებელი',
    'ss.certificate': 'სერტიფიკატი',
    'ss.courseLink': 'კურსის ბმული',
    'ss.earnByTask': 'დავალებით მოპოვება',
    'ss.noSkills': 'ჯერ უნარები არ არის — დაამატე ზემოთ.',
    'ss.finish': 'დასრულება',
    'ss.saving': 'ინახება…',
    'ss.doneTitle': 'ყველაფერი მზადაა',
    'ss.doneText': 'შენი პროფილი აქტიურია. დაათვალიერე დავალებები შენს სფეროში და დაიწყე სკრინინგით.',
    'ss.browseTasks': 'დავალებების დათვალიერება',

    // company signup
    'cs.step.identity': 'იდენტობა',
    'cs.step.contact': 'კონტაქტი',
    'cs.step.agreement': 'შეთანხმება',
    'cs.step.done': 'დასრულდა',
    'cs.title': 'კომპანიის იდენტობა',
    'cs.subtitle': 'ჩვენ ვამოწმებთ იურიდიულ რეგისტრაციას პლატფორმის უსაფრთხოებისთვის.',
    'cs.legalName': 'კომპანიის იურიდიული სახელი',
    'cs.regId': 'რეგისტრაციის / საგადასახადო ID',
    'cs.website': 'ვებგვერდი',
    'cs.alreadyReg': 'უკვე დარეგისტრირებული ხარ?',
    'cs.contactTitle': 'კონტაქტი',
    'cs.domainInfo': 'გამოიყენე კომპანიის დომენის ელფოსტა (gmail და მსგავსი პროვაიდერები არ მიიღება).',
    'cs.contactName': 'საკონტაქტო პირი',
    'cs.domainEmail': 'კომპანიის დომენის ელფოსტა',
    'cs.accountPassword': 'ანგარიშის პაროლი',
    'cs.emailInvalidCompany': 'შეიყვანე სწორი ელფოსტა, მაგ. name@company.ge',
    'cs.agreementTitle': 'პარტნიორობის შეთანხმება',
    'cs.agreementIntro': 'StepIn-ში გაწევრიანებით თანხმდები პარტნიორობის და დავალების პირობებზე, რომლებიც მოიცავს:',
    'cs.agreement1': 'ინტელექტუალური საკუთრების გადაცემა მხოლოდ ხელმოწერილი შეთანხმებით, სტუდენტის პორტფოლიოს სავალდებულო დათქმით.',
    'cs.agreement2': 'არა-მოზიდვის პრინციპი: დავალებები უნდა იყოს მცირე, კონკრეტული და არა-სენსიტიური.',
    'cs.agreement3': 'კონფიდენციალურობა და მხოლოდ სანიმუშო მონაცემების გამოქვეყნება.',
    'cs.agreement4': 'გადაწყვეტილების ვადების დაცვა — მათი განმეორებით დარღვევა აისახება შენს სტატუსზე.',
    'cs.accept': 'ვეთანხმები პარტნიორობის შეთანხმებას და დავალების პირობებს.',
    'cs.createCompany': 'კომპანიის ანგარიშის შექმნა',
    'cs.submitting': 'იგზავნება…',
    'cs.probationTag': 'გამოსაცდელი ვადა — შეზღუდული უფლებები',
    'cs.doneTitle': 'შენ დარეგისტრირდი',
    'cs.doneText':
      'ახალი კომპანიები იწყებენ გამოსაცდელი ვადით და ერთდროულად 3 დავალების ლიმიტით. სრული უფლებები მოიპოვება აქტიურობით — უკუკავშირით, გამარჯვებულების შერჩევით და გადაწყვეტილების ვადების დაცვით.',
    'cs.goDashboard': 'დაფაზე გადასვლა',

    // app shell / nav
    'nav.internships': 'სტაჟირებები',
    'nav.tasks': 'დავალებები',
    'nav.myApplications': 'ჩემი განაცხადები',
    'nav.profile': 'პროფილი',
    'nav.dashboard': 'დაფა',
    'nav.postTask': 'დავალების გამოქვეყნება',
    'nav.myTasks': 'ჩემი დავალებები',
    'nav.companyProfile': 'კომპანიის პროფილი',
    'nav.overview': 'მიმოხილვა',
    'nav.companyVetting': 'კომპანიების შემოწმება',
    'nav.sensitivity': 'სენსიტიურობა',
    'nav.templates': 'შაბლონები',
    'nav.scoringSlots': 'შეფასება და სლოტები',
    'nav.disputes': 'დავები და გამოუცხადებლობა',
    'shell.footer1': 'გადადგი შენი პირველი ნაბიჯი.',
    'shell.footer2': 'რეალური დავალებები · დადასტურებული გამოცდილება.',

    // student tasks
    'tasks.title': 'დავალებები',
    'tasks.subtitle': 'რეალური, მცირე დავალებები სანიმუშო მონაცემებით შენს სფეროში.',
    'tasks.search': 'დავალებების ძებნა',
    'tasks.allFields': 'ყველა სფერო',
    'tasks.anyMotive': 'ნებისმიერი მიზანი',
    'tasks.paidOrUnpaid': 'ანაზღაურებადი თუ არა',
    'tasks.stipendOnly': 'მხოლოდ სტიპენდია',
    'tasks.noMatch': 'ფილტრებით დავალება ვერ მოიძებნა',
    'tasks.sampleData': 'სანიმუშო მონაცემები',
    'tasks.credential': 'სერტიფიკატი',
    'tasks.stipendSuffix': 'სტიპენდია',
    'tasks.verified': 'ვერიფიცირებული',
    'tasks.applied': 'განაცხადი გაგზავნილია',
    'tasks.applicationsClose': 'განაცხადები იხურება',
    'tasks.appliedOfCap': '{n} / {m} განაცხადი',
    'tasks.tabInternships': 'სტაჟირებები',
    'tasks.tabStandalone': 'დავალებები',
    'tasks.internshipsSubtitle': 'რეალური სტაჟირებები, რომლებზეც საცდელი დავალებით ხვდები — გამარჯვებული ფინალისტი ინიშნება.',
    'tasks.standaloneSubtitle': 'ერთჯერადი დავალებები, რომლებიც ქმნის შენს დადასტურებულ პროფილს. სტაჟირება გარანტირებული არ არის.',
    'tasks.internshipBadge': 'სტაჟირება',
    'tasks.guaranteedHire': 'გამარჯვებული ინიშნება',
    'tasks.noInternships': 'ფილტრებით სტაჟირება ვერ მოიძებნა',
    'motive.needs_now': 'ახლავე სჭირდება',
    'motive.scouting': 'ტალანტის ძიება',

    // company dashboard
    'cd.subtitle': 'შენი აქტიური დავალებები და თითოეულის მდგომარეობა.',
    'cd.postTask': 'დავალების გამოქვეყნება',
    'cd.atCap': 'მიღწეულია ერთდროული დავალებების ლიმიტი ({n}).',
    'cd.probationLabel': 'გამოსაცდელი ვადა — შეზღუდული უფლებები',
    'cd.trustedLabel': 'სანდო კომპანია',
    'cd.flaggedLabel': 'მონიშნული — გამოქვეყნება შეზღუდულია',
    'cd.tasksUsed': 'გამოყენებულია {open} / {cap} დავალება',
    'cd.probationText':
      'გამოსაცდელ ვადაზე შეგიძლია გამოაქვეყნო ლიმიტის ფარგლებში. სრული უფლებები მოიპოვე აქტიურობით: მიეცი სკრინინგის უკუკავშირი, აირჩიე გამარჯვებულები და დაიცავი გადაწყვეტილების ვადები.',
    'cd.trustedText': 'სრული უფლებები. სანდოობის შესანარჩუნებლად დაიცავი გადაწყვეტილების ვადები.',
    'cd.flaggedText': 'გამოქვეყნება შეზღუდულია, სანამ შენი სტატუსი განიხილება. აღსადგენად დაასრულე ღია გადაწყვეტილებები.',
    'cd.activeTasks': 'აქტიური დავალებები',
    'cd.noTasks': 'ჯერ დავალებები არ არის',
    'cd.postFirst': 'გამოაქვეყნე პირველი დავალება',
    'cd.applied': 'განაცხადი',
    'cd.screened': 'სკრინინგი',
    'cd.shortlistReady': 'შერჩევა მზადაა',
    'cd.reviewShortlist': 'შერჩევის ნახვა',
    'cd.decideBy': 'გადაწყვეტ',
    'cd.screeningDue': 'სკრინინგის ვადა',
    'cd.applicationsClose': 'განაცხადები იხურება',
    'cd.overdue': 'ვადაგადაცილებული',

    // admin overview
    'ao.title': 'მიმოხილვა',
    'ao.subtitle': 'პლატფორმის ოპერაციები — შემოწმება, სენსიტიურობა, შაბლონები, შეფასება და დავები.',
    'ao.companies': 'კომპანიები',
    'ao.students': 'სტუდენტები',
    'ao.tasks': 'დავალებები',
    'ao.onProbation': 'გამოსაცდელ ვადაზე',
    'ao.openIncidents': 'ღია ინციდენტები',
    'ao.flaggedCompanies': 'მონიშნული კომპანიები',
    'ao.goTo': 'გადასვლა',
    'ao.companyVetting': 'კომპანიების შემოწმება',
    'ao.taskSensitivity': 'დავალების სენსიტიურობა',
    'ao.screeningTemplates': 'სკრინინგის შაბლონები',
    'ao.scoringSlots': 'შეფასება და სლოტები',
    'ao.disputes': 'დავები და გამოუცხადებლობა',
  },
};

const LangCtx = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(LANG_KEY);
    return saved === 'ka' || saved === 'en' ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l), []);

  const t = useCallback(
    (key, vars) => {
      let str = dict[lang]?.[key] ?? dict.en[key] ?? key;
      if (vars) {
        for (const k in vars) str = str.replaceAll(`{${k}}`, vars[k]);
      }
      return str;
    },
    [lang]
  );

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useT() {
  const ctx = useContext(LangCtx);
  // Safe fallback if a component renders outside the provider.
  if (!ctx) return { lang: 'en', setLang: () => {}, t: (k) => dict.en[k] ?? k };
  return ctx;
}

/* Compact EN | ქარ switch. */
export function LanguageToggle({ style }) {
  const { lang, setLang } = useT();
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '0.5px solid var(--border-strong)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--surface-0)',
        ...style,
      }}
    >
      {LANGS.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            style={{
              border: 'none',
              padding: '5px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: active ? 'var(--teal-700, #0f7a5a)' : 'transparent',
              color: active ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

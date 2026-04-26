function t(key) {
	return chrome.i18n.getMessage(key) || key;
}

document.addEventListener('DOMContentLoaded', () => {
	document.title = t('optionsTitle');

	const map = {
		'opt-h1': 'optionsH1',
		'opt-intro': 'optionsIntro',
		'opt-warn-strong': 'optionsWarnStrong',
		'opt-warn-rest': 'optionsWarnRest',
		'opt-h2-setup': 'optionsH2Setup',
		'opt-setup-1': 'optionsSetup1',
		'opt-setup-2': 'optionsSetup2',
		'opt-setup-3': 'optionsSetup3',
		'opt-h2-nav': 'optionsH2Nav',
		'opt-nav-p1': 'optionsNavP1',
		'opt-nav-li1': 'optionsNavLi1',
		'opt-nav-li2': 'optionsNavLi2',
		'opt-nav-li3': 'optionsNavLi3',
		'opt-h2-play': 'optionsH2Play',
		'opt-play-p1': 'optionsPlayP1',
		'opt-h2-trouble': 'optionsH2Trouble',
		'opt-trouble-1': 'optionsTrouble1',
		'opt-trouble-2': 'optionsTrouble2',
		'opt-trouble-3': 'optionsTrouble3',
	};

	for (const [id, key] of Object.entries(map)) {
		const el = document.getElementById(id);
		if (el) el.textContent = t(key);
	}
});

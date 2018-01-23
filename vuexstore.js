const store = new Vuex.Store({
    state: {
        ruleForDeleteIndex: '',
        ruleForEditIndex: '',
        deleteMutated: false,
        editMutated: false,
        isRunning: false
    },
    mutations: {
        setRuleForDeleteIndex(state, index) {
            console.log('delete in set', index);
            state.ruleForDeleteIndex = index;
            state.deleteMutated = !state.deleteMutated;

        },
        setRuleForEditIndex(state, index) {
            state.ruleForEditIndex = index;
            state.editMutated = !state.editMutated;
        },
        setRunning(state) {
            state.isRunning = true;
        },
        unsetRunning(state) {
            state.isRunning = false;
        }
    }
});


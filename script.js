Vue.component('rule', {
    props: ['index', 'rule'],
    template: `<div :class="['rule', {rule_activated: rule.isActive}, {rule_selected: rule.isSelected}]">
                    <span class="rule_number">{{index}})</span>
                    <span class="rule_text">{{rule.text}}</span>
                    <i @click='editRule' class="rule_edit material-icons" v-if="!isRunning">edit</i>
                    <i @click='deleteRule' class="rule_delete material-icons" v-if="!isRunning">delete</i>
                </div>`,
    computed: {
        isRunning: function () {
            return store.state.isRunning;
        }
    },
    methods: {
        editRule: function () {
            store.commit('setRuleForEditIndex', this.index);
        },
        deleteRule: function () {
            store.commit('setRuleForDeleteIndex', this.index);
        }
    }
});

Vue.component('fact_row', {
    props: ['array_of_facts'],
    template: `<p>{{factStr}}</p>`,
    computed: {
        factStr: function () {
            return this.array_of_facts.toString();
        }
    }
});

Vue.component('working_rules_row', {
    props: ['array_of_rule_indexes'],
    template: `<p>{{rulesStr}}</p>`,
    computed: {
        rulesStr: function () {
            return this.array_of_rule_indexes.toString();
        }
    }
});

Vue.component('choosed_rule', {
    props: ['rule_index'],
    template: `<p>{{rule_index}}</p>`,
});

let startRules = [
    'if a and b and n then f',
    'if c and k or l then p or ',
    'if a and f and p or c then r',
    'if d or k and l then o and e',
    'if r and a or f then h and m',
    'if m or d and k or o then d',
    'if s and c then l and h',
    'if h then e',
    'if e and l then s',
    'if d or p and n then p and r',
    'if r and s or e then f',
    'if f and e or p and r then goal',
    'if o and l or n then k',
    'if m or c then d',
    'if k and a and o then goal',
    'if s and e and r then l'
];

let baseOfKnowledge = new Vue({
    el: '#app',
    data: {
        modalIsVisible: false,
        edit: false,
        activeIndex: 0,

        ruleText: '',
        startFactsStr: 'a, b, c',

        rules: [],
        ruleObjects: [],

        strategy: 'Перше правило',
        consequent_strategy: 'Ширина',

        ruleAntecedentNodes: [],
        workingMemory: [],
        workingListOfRules: [],
        selectedRulesIndexes: []
    },
    computed: {
        editMutated: function() {
            return store.state.editMutated;
        },
        deleteMutated: function() {
            return store.state.deleteMutated;
        },
        isRunning: function () {
            return store.state.isRunning;
        }
    },
    watch: {
        deleteMutated: function () {
            this.rules.splice(store.state.ruleForDeleteIndex, 1);
            this.ruleObjects.splice(store.state.ruleForDeleteIndex, 1);
        },
        editMutated: function () {
            this.edit = true;
            this.ruleText = this.rules[store.state.ruleForEditIndex].text;
            this.modalIsVisible = true;
        }
    },
    methods: {
        showModal: function () {
            this.modalIsVisible = true;
        },
        cancelModal: function () {
            this.ruleText = '';
            this.modalIsVisible = false;
        },
        saveRule: function () {

            if(this.ruleText !== '') {
                this.ruleText = this.ruleText.toLowerCase();
                let tokens = getTokens(this.ruleText);
                let isCorrect = isSyntaxCorrect(tokens);
                if(isCorrect) {
                    let ruleObj = buildRuleObj(this.ruleText);
                    let ruleObjAnt = ruleObj.antecedent;
                    if(checkForGoal(ruleObjAnt)) {
                        alert('goal can not be present in antecedent');
                        return;
                    }
                    if(this.edit) {
                        this.rules[store.state.ruleForEditIndex] = {
                            text: this.ruleText,
                            isActive: false,
                            isSelected: false
                        };
                        this.ruleObjects[store.state.ruleForEditIndex] = ruleObj;
                        this.edit = false;
                    } else {
                        this.rules.push({
                            text: this.ruleText,
                            isActive: false,
                            isSelected: false
                        });
                        this.ruleObjects.push(ruleObj);
                    }
                    this.ruleText = '';
                    this.modalIsVisible = false;
                } else {
                    // alert('syntax error');
                }

            }
        },
        start: function () {
            if(this.isRunning) {
                clearSelection(this.rules);
                this.workingMemory = [];
                this.workingListOfRules = [];
                this.selectedIndex = -1;
                this.activeIndex = 0;
                this.ruleAntecedentNodes = [];
                this.selectedRulesIndexes = [];
                store.commit('unsetRunning');
                return;
            }
            //если задан массив стартовых правил
            if(startRules) {
                saveRules();
            }
            //Проверяем все правила на наличие GOAL
            let goalIsPresent = false;
            for(let ruleObj of this.ruleObjects) {
                if(checkForGoal(ruleObj.consequent)) {
                    goalIsPresent = true;
                    break;
                }
            }
            if(!goalIsPresent) {
                alert('At least one rule must contain GOAL');
                return;
            }
            //Строим массив стартовых фактов, заносим их в рабочую память
            if(!this.startFactsStr) {
                alert('Please, input start facts');
                return;
            }
            let arrayOfStartFacts = buildStartFacts(this.startFactsStr);
            if(!arrayOfStartFacts) {
                alert('" " can not be present in start facts');
                return;
            }
            this.workingMemory.push(arrayOfStartFacts);
            //Строим nodes по антицидентам для всех правил
            for(let ruleObj of this.ruleObjects) {
                this.ruleAntecedentNodes.push(buildNode(ruleObj.antecedent));
            }
            store.commit('setRunning');
        },
        next: function () {
            //проверяем достигнута ли цель
            if(isGoalReached(this.workingMemory[this.activeIndex])) {
                alert('GOAL IS REACHED');
                return;
            }

            //очищаем все выделения
            clearSelection(this.rules);

            //Формируем список активированных правил
            let arrayOfActiveRules = [];
            if(this.activeIndex > 0) {
                arrayOfActiveRules = arrayOfActiveRules.concat(this.workingListOfRules[this.activeIndex - 1]);
                let ruleToDelete = arrayOfActiveRules.indexOf(this.selectedRulesIndexes[this.selectedRulesIndexes.length - 1]);
                arrayOfActiveRules.splice(ruleToDelete, 1);
            }
            for(let i = 0; i < this.ruleAntecedentNodes.length; i++) {
                let node = this.ruleAntecedentNodes[i];
                let isActivated = checkNode(node, this.workingMemory[this.activeIndex]);
                if(isActivated) {
                    // this.rules[i].isActive = true;
                    let isNew = isRuleNew(this.workingListOfRules, i);
                    // console.log('i', i);
                    if(isNew) {
                        // console.log('I', i);
                        arrayOfActiveRules.push(i);
                    }
                }
            }
            if(arrayOfActiveRules.length === 0) {
                alert('It is impossible to reach the goal');
                return;
            }
            arrayOfActiveRules.sort(function (a,b) {
                return a - b;
            });
            this.workingListOfRules.push(arrayOfActiveRules);
            for(let ruleIndex of arrayOfActiveRules) {
                this.rules[ruleIndex].isActive = true;
            }

            //По выбранной стратегии выбираем из списка правило одно
            let selectedIndex = chooseRule(arrayOfActiveRules, this.ruleAntecedentNodes, this.strategy);
            this.selectedRulesIndexes.push(selectedIndex);
            this.rules[selectedIndex].isSelected = true;
            let selectedRule = this.ruleObjects[selectedIndex];
            let consequentNode = buildNode(selectedRule.consequent);

            //Переносим факты из этого правила в рабочую память
            let activatedFacts = getAllActivatedFacts(consequentNode, this.consequent_strategy);
            let newFacts = this.workingMemory[this.activeIndex].slice();
            for(let fact of activatedFacts) {
                if(newFacts.indexOf(fact) === -1) {
                    newFacts.push(fact);
                }
            }
            this.workingMemory.push(newFacts);
            this.activeIndex++;
        },
        prev: function () {
            if(this.activeIndex > 0) {
                clearSelection(this.rules);
                this.activeIndex--;
                this.workingMemory.pop();
                this.workingListOfRules.pop();
                this.selectedRulesIndexes.pop();
            }
        }
    }

});

const FIRST_RULE = 'Перше правило';
const LAST_RULE = 'Останнє правило';
const SIMPLE = 'Спрощення';
const COMPLEX = 'Ускладнення';

function chooseRule(rulesIndexes, anecedents, strategy) {
    let activatedIndex = -1;
    switch (strategy) {
        case FIRST_RULE: {
            activatedIndex = rulesIndexes[0];
            break;
        }
        case LAST_RULE: {
            activatedIndex = rulesIndexes[rulesIndexes.length - 1];
            break;
        }
        case SIMPLE: {
            let minComplexity = 99999999;
            let minComplexityIndex = -1;
            for(let index of rulesIndexes) {
                globalRuleCounter = 0;
                let ruleAnt = anecedents[index];
                calcComplexity(ruleAnt);
                let levelOfComplexity = globalRuleCounter;
                //не доделано
                if(levelOfComplexity < minComplexity) {
                    minComplexity = levelOfComplexity;
                    minComplexityIndex = index;
                }
            }
            activatedIndex = minComplexityIndex;
            break;
        }
        case COMPLEX: {
            let maxComplexity = 0;
            let maxComplexityIndex = -1;
            for(let index of rulesIndexes) {
                globalRuleCounter = 0;
                let ruleAnt = anecedents[index];
                calcComplexity(ruleAnt);
                let levelOfComplexity = globalRuleCounter;
                //не доделано
                if(levelOfComplexity > maxComplexity) {
                    maxComplexity = levelOfComplexity;
                    maxComplexityIndex = index;
                }
            }
            activatedIndex = maxComplexityIndex;
            break;
        }
    }
    return activatedIndex;
}

function isGoalReached(facts) {
    for(let fact of facts) {
        if(fact === 'goal') {
            return true;
        }
    }
}

function clearSelection(rules) {
    if(rules) {
        for(let rule of rules) {
            rule.isActive = false;
            rule.isSelected = false;
        }
    }

}

function isRuleNew(listOfWorkingRules, ruleIndex) {
    for(let i = 0; i < listOfWorkingRules.length; i++) {
        for(let j = 0; j < listOfWorkingRules[i].length; j++) {
            if(listOfWorkingRules[i][j] === ruleIndex) {
                return false;
            }
        }
    }
    return true;
}

function saveRules() {
    for(let rule of startRules) {
        rule = rule.toLowerCase();
        let tokens = getTokens(rule);
        let isCorrect = isSyntaxCorrect(tokens);
        if(isCorrect) {
            let ruleObj = buildRuleObj(rule);
            let ruleObjAnt = ruleObj.antecedent;
            if(checkForGoal(ruleObjAnt)) {
                alert('goal can not be present in antecedent');
                return;
            }
            baseOfKnowledge.rules.push({
                text: rule,
                isActive: false,
                isSelected: false
            });
            baseOfKnowledge.ruleObjects.push(ruleObj);

        } else {
            // alert('syntax error');
        }
    }

}





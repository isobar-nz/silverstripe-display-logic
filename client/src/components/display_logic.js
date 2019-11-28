/* global window */
// eslint-disable-next-line
import jQuery from 'jquery';

jQuery.noConflict();

window.ss = window.ss || {};

jQuery.entwine('ss', ($) => {
  const animation = {
    toggle: {
      show(el) {
        const element = el[0];
        element.style.display = '';
        element.classList.remove('display-logic-hidden');
      },
      hide(el) {
        const element = el[0];
        element.style.display = 'none';
      }
    },
    slide: {
      show(el) {
        el.slideDown();
      },
      hide(el) {
        el.slideUp();
      }
    },
    fade: {
      show(el) {
        el.fadeIn();
      },
      hide(el) {
        el.fadeOut();
      }
    },

    perform(el, result, method = 'toggle') {
      if (result) {
        this[method].show(el);
      } else {
        this[method].hide(el);
      }
    }
  };

  $('div.display-logic, div.display-logic-master').entwine({

    escapeSelector(selector) {
      return selector
        .replace(/[^a-zA-Z0-9\-_:.]+/g, '_') // No special characters
        .replace(/_+/g, '_') // Merge duplicate underscores
        .replace(/_*$/, ''); // no trailing underscore
    },

    getForm() {
      return this.closest('form');
    },

    getLogicHolder() {
      return this.closest('.displaylogic-holder, form');
    },

    findHolder(name) {
      const holderName = this.nameToHolder(name);
      return this.getLogicHolder().find(`#${holderName}`);
    },

    getFormField() {
      const results = this.find('input, select, textarea');
      if (results.length) {
        return $(results[0]);
      }
      return null;
    },

    getFieldName() {
      const field = this.getFormField();

      // Get field name property
      if (field) {
        const name = field.prop('name');
        if (name) {
          return name;
        }
      }

      // Fallback to parsing ID property, remove _Holder
      const fieldID = this.attr('id');
      if (fieldID) {
        return this.attr('id')
          .replace(new RegExp(`^${this.getFormID()}_`), '')
          .replace(/_Holder$/, '');
      }

      return null;
    },

    nameToHolder(name) {
      const holderName = this.escapeSelector(name);
      return `${this.getFormID()}_${holderName}_Holder`;
    },

    getFormID() {
      return this.getForm().attr('id');
    },

    getFieldValue() {
      return this.getFormField().val();
    },

    evaluateEqualTo(val) {
      return this.getFieldValue() === val;
    },

    evaluateNotEqualTo(val) {
      return this.getFieldValue() !== val;
    },

    evaluateGreaterThan(val) {
      const num = parseFloat(val);
      return parseFloat(this.getFieldValue()) > num;
    },

    evaluateLessThan(val) {
      const num = parseFloat(val);
      return parseFloat(this.getFieldValue()) < num;
    },

    evaluateContains(val) {
      return this.getFieldValue().match(val) !== null;
    },

    evaluateStartsWith(val) {
      return this.getFieldValue().match(new RegExp(`^${val}`)) !== null;
    },

    evaluateEndsWith(val) {
      return this.getFieldValue().match(new RegExp(`${val}$`)) !== null;
    },

    evaluateEmpty() {
      return $.trim(this.getFieldValue()).length === 0;
    },

    evaluateNotEmpty() {
      return !this.evaluateEmpty();
    },

    evaluateBetween(minmax) {
      const v = parseFloat(this.getFieldValue());
      const parts = minmax.split('-');
      if (parts.length === 2) {
        return v > parseFloat(parts[0]) && v < parseFloat(parts[1]);
      }
      return false;
    },

    evaluateChecked() {
      return this.getFormField().is(':checked');
    },

    evaluateNotChecked() {
      return !this.getFormField().is(':checked');
    },

    onmatch() {
      let allReadonly = true;
      let masters = [];

      masters = this.getMasters();
      if (masters && masters.length) {
        Object.entries(masters).forEach(entry => {
          const [, selector] = entry;
          const holderName = this.nameToHolder(selector);
          const master = this.getLogicHolder().find(`#${holderName}`);

          if (!master.is('.readonly')) {
            allReadonly = false;
          }

          master.addClass('display-logic-master');
          if (master.find('input[type=radio]').length) {
            master.addClass('optionset');
          }
          if (master.find('input[type=checkbox]').length > 1) {
            master.addClass('checkboxset');
          }
        });
      }

      // If all the masters are readonly fields, the field has no way of displaying.
      if (masters.length && allReadonly) {
        this.show();
      }
    },

    getLogic() {
      return $.trim(this.getFormField().data('display-logic-eval'));
    },

    parseLogic() {
      const js = this.getLogic();
      // eslint-disable-next-line no-new-func
      return new Function(`return ${js}`).bind(this)();
    },

    getMasters() {
      const masters = this.getFormField().data('display-logic-masters');
      return (masters) ? masters.split(',') : [];
    },

    getAnimationTargets() {
      return [this.findHolder(this.getFieldName())];
    }

  });

  $('div.checkboxset').entwine({

    evaluateHasCheckedOption(val) {
      let found = false;
      this.find(':checkbox').filter(':checked').each(function () {
        found = (found || ($(this).val() === val || $(this).getLabel().text() === val));
      });

      return found;
    },

    evaluateHasCheckedAtLeast(num) {
      return this.find(':checked').length >= num;
    },

    evaluateHasCheckedLessThan(num) {
      return this.find(':checked').length <= num;
    }

  });

  $('input[type=checkbox]').entwine({
    getLabel() {
      return this.closest('form').find(`label[for=${this.getHolder().escapeSelector(this.attr('id'))}]`);
    }
  });


  $('div.display-logic.display-logic-display').entwine({
    testLogic() {
      this.getAnimationTargets().forEach(t => {
        animation.perform(t, this.parseLogic(), this.getFormField().data('display-logic-animation'));
      });
    }
  });


  $('div.display-logic.display-logic-hide').entwine({
    testLogic() {
      this.getAnimationTargets().forEach(t => {
        animation.perform(t, !this.parseLogic(), this.getFormField().data('display-logic-animation'));
      });
    }
  });


  $('div.display-logic-master input[type="text"], ' +
    'div.display-logic-master input[type="email"], ' +
    'div.display-logic-master input[type="numeric"]').entwine({
    onmatch() {
      this.closest('.display-logic-master').notify();
    },

    onkeyup() {
      this.closest('.display-logic-master').notify();
    },

    onchange() {
      this.closest('.display-logic-master').notify();
    }
  });


  $('div.display-logic-master select').entwine({
    onmatch() {
      this.closest('.display-logic-master').notify();
    },

    onchange() {
      this.closest('.display-logic-master').notify();
    }
  });

  $('div.display-logic-master :checkbox, div.display-logic-master :radio').entwine({
    onmatch() {
      this.closest('.display-logic-master').notify();
    },

    onclick() {
      this.closest('.display-logic-master').notify();
    }
  });

  $('div.display-logic.optionset, div.display-logic-master.optionset').entwine({
    getFieldValue() {
      return this.find(':checked').val();
    },
    getAnimationTargets() {
      return this._super().concat(this.findHolder(this.getFieldName()).find('.optionset'));
    }

  });

  $('div.display-logic-master').entwine({
    Listeners: null,

    notify() {
      $.each(this.getListeners(), function () {
        $(this).testLogic();
      });
    },

    getListeners() {
      const l = this._super();
      if (l) {
        return l;
      }
      const self = this;
      const listeners = [];
      this.getLogicHolder().find('.display-logic').each(function () {
        const masters = $(this).getMasters();
        if (masters && masters.length) {
          Object.entries(masters).forEach(entry => {
            const [, selector] = entry;
            if (self.nameToHolder(selector) === self.attr('id')) {
              listeners.push($(this)[0]);
            }
          });
        }
      });
      this.setListeners(listeners);

      return this.getListeners();
    }
  });

  $(`div.display-logic.displaylogicwrapper.display-logic-display,
     div.display-logic.displaylogicwrapper.display-logic-hide`
  ).entwine({
    getFormField() {
      return this;
    },

    getFieldName() {
      return '';
    },

    getAnimationTargets() {
      return [this];
    }
  });

  $('div.field *').entwine({
    getHolder() {
      return this.parents('.field');
    }
  });
});

/**
 *
 * Question Unit plugin to render a MCQ question
 * @class org.ekstep.questionunit.mcq
 * @extends org.ekstep.contentrenderer.questionUnitPlugin
 * @author Manoj Chandrashekar <manoj.chandrashekar@tarento.com>
 */
org.ekstep.questionunitmtf = {};
org.ekstep.questionunitmtf.RendererPlugin = org.ekstep.contentrenderer.questionUnitPlugin.extend({
  _type: 'org.ekstep.questionunit.mtf',
  _isContainer: true,
  _render: true,
  _selectedAanswers: [],
  _mtfData: undefined,
  _mtfConfig: undefined,
  _dragularContainers: [],
  initTemplate: function() {
    this._template = QS_MTFTemplate.htmlLayout;
  },
  preQuestionShow: function(event) {
    var instance = this;
    QS_MTFTemplate.optionsWidth = undefined;
    QS_MTFTemplate.selAns = [];
    instance._selectedAanswers = [];
    var questionsetInstance = event.target;
    var qData = questionsetInstance._currentQuestion.data.__cdata || questionsetInstance._currentQuestion.data;
    questionData = JSON.parse(qData);
    instance._mtfData = questionData;
    //RHS options data shuffle
    questionData.option.optionsRHS = _.shuffle(questionData.option.optionsRHS);
    var qConfig = questionsetInstance._currentQuestion.config.__cdata || questionsetInstance._currentQuestion.config;
    questionConfig = JSON.parse(qConfig);
    instance._mtfConfig = questionConfig;
    var qState = questionsetInstance._currentQuestionState;
    var currentquesObj = {
      "questionData": questionData,
      "questionConfig": questionConfig,
      "qState": qState
    };
    for (var lhs = 0; lhs < questionData.option.optionsLHS.length; lhs++) {
      var emptyBox = {
        "index": questionData.option.optionsLHS[lhs].index,
        "selText": " "
      };
      QS_MTFTemplate.selAns.push(emptyBox);
    }
    if (qState && qState.val) {
      instance._selectedAanswers = qState.val.lhs;
      QS_MTFTemplate.selAns = qState.val.lhs;
      instance._mtfData.option.optionsRHS = qState.val.rhs;
    }
    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.ASSESS); // eslint-disable-line no-undef
    if (instance._mtfData.option.optionsLHS.length == 3) {
      QS_MTFTemplate.optionsWidth = 'width33';
    } else if (instance._mtfData.option.optionsLHS.length == 4) {
      QS_MTFTemplate.optionsWidth = 'width25';
    } else if (instance._mtfData.option.optionsLHS.length == 5) {
      QS_MTFTemplate.optionsWidth = 'width20';
    }
    _.each(instance._mtfData.option.optionsLHS, function(v, k) {
      var lhs = 'left' + (k + 1);
      var rhs = 'right' + (k + 1);
      instance._dragularContainers.push(lhs);
      instance._dragularContainers.push(rhs);
    });
    return currentquesObj;
  },
  dragulaIsContainer: function(el){
    return el.classList.contains('cont-dragula');
  },
  postQuestionShow: function(currentquesObj) {
    var instance = this;
    var responseData = {};
    var left1 = $('#left1')
    var drake = dragula({
      isContainer: function (el) {
        return instance.dragulaIsContainer(el);
        },
      accepts: function(el, t, s, si) {
        if ($(t).children().length > 0) {
          return false;
        }
        return true;
      }
    });
    var leftList = document.querySelector('#left1');
    var rightList = document.querySelector('#right1');
    drake.on('drop', function(el, t, s, si) {
      if (!_.isUndefined($(s).attr('mapIndex'))) {
        var rhsData = {};
        var ts = $(t)[0].childNodes[0];
        var text = $(t).text();
        rhsData.mapIndex = $(s).attr('mapIndex');
        rhsData.selText = text.trim();
        //check element existing in array if remove it or add into array
        var existEle = _.some(instance._selectedAanswers, function(elem) {
          return elem.mapIndex == $(s).attr('mapIndex');
        });
        if (!existEle) {
          instance._selectedAanswers.push(rhsData);
          responseData = [{
            "lhs": currentquesObj.questionData.option.optionsLHS[($(s).attr('mapIndex')-1)].text,
            "rhs": text.trim()
          }];
          instance.logTelemetryItemResponse(responseData);
        } else {
          //console.log("Remove element dont remove");
        }
      } else {
        instance._selectedAanswers = _.filter(instance._selectedAanswers, function(item) {
          return item.mapIndex !== $(t).attr('mapIndex')
        });
      }
    });
  },
  evaluateQuestion: function(callback) {
    var instance = this;
    var cb = callback.target;
    var correctAnswer = true;
    var teleValues = [];
    var tempCount = 0;
    var qLhsData = instance._mtfData.option.optionsLHS;
    if (!_.isUndefined(instance._selectedAanswers)) {
      for (var i = 0; i < instance._mtfData.option.optionsLHS.length; i++) {
        var telObj = {};
        if (!_.isUndefined(instance._selectedAanswers[i])) {
          telObj[qLhsData[i].text] = instance._selectedAanswers[i].selText;
          teleValues.push(telObj);
          var t = instance._selectedAanswers[i].mapIndex;
          if (qLhsData[i].index != Number(t)) {
            correctAnswer = false;
          } else {
            tempCount++;
          }
        } else {
          correctAnswer = false;
        }
      }
    }
    var partialScore = (tempCount / qLhsData.length) * instance._mtfConfig.max_score;
    var result = {
      eval: correctAnswer,
      state: {
        val: {
          "lhs": instance._selectedAanswers,
          "rhs": instance._mtfData.option.optionsRHS
        }
      },
      score: partialScore,
      values: teleValues,
      noOfCorrectAns: tempCount,
      totalAns: instance._mtfData.option.optionsLHS.length
    }
    if (_.isFunction(cb)) {
      cb(result);
    }
    EkstepRendererAPI.dispatchEvent('org.ekstep.questionset:saveQuestionState', result.state);
    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.ASSESSEND, result);
  },
  logTelemetryItemResponse: function(data) { 
    QSTelemetryLogger.logEvent(QSTelemetryLogger.EVENT_TYPES.RESPONSE, { "type": "INPUT", "values": data });
  }
});
//# sourceURL=questionunitMTFPlugin.js
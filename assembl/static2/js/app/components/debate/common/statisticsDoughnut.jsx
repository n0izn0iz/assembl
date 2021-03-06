import React from 'react';
import { Translate } from 'react-redux-i18n';

import Doughnut from '../../svg/doughnut';

const StatisticsDoughnut = ({ elements }) => {
  const totalCount = elements.reduce((result, element) => {
    return result + element.count;
  }, 0);
  return (
    <div className="statistics-doughnut">
      <div className="statistics">
        <div className="superpose-label superpose">
          <div className="doughnut-label-count">
            {totalCount}
          </div>
          <div className="doughnut-label-text">
            <Translate value="debate.survey.reactions" />
          </div>
        </div>
        <div className="superpose">
          <Doughnut elements={elements} />
        </div>
      </div>
    </div>
  );
};

export default StatisticsDoughnut;